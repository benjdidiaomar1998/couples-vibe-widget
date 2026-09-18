package com.couples.vibe.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import com.couples.vibe.CouplesVibeApp
import com.couples.vibe.MainActivity
import com.couples.vibe.data.VibeRepository
import com.couples.vibe.widget.CoupleWidget
import com.couples.vibe.widget.PREF_COUPLE_ID
import com.couples.vibe.widget.PREF_MY_VIBES
import com.couples.vibe.widget.PREF_PARTNER_NAME
import com.couples.vibe.widget.PREF_PARTNER_VIBES
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.DatabaseReference
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Senior Android Architecture: Minimalist, Event-Driven Foreground Service for Realtime Widget Sync.
 *
 * Why this is required:
 * When the Android app is closed, the Android OS kills all background processes.
 * Without this foreground service maintaining an active WebSocket listener, the phone
 * cannot receive Firebase push updates while the app is closed.
 *
 * Performance Characteristics:
 * - 0% IDLE CPU: Sits completely dormant on the Linux network socket awaiting TCP packets.
 * - TARGETED SCOPE: Listens strictly to `/couples/{coupleId}/currentVibes` (~150 bytes).
 * - STRICT STATE DIFFING: If the incoming vibe is identical, exits on line 1 without touching Glance.
 * - ZERO DISK CHURN: No keepSynced SQLite churning, no periodic timers, no polling.
 */
class VibeForegroundService : Service() {

    private val serviceJob = SupervisorJob()
    private val scope = CoroutineScope(Dispatchers.IO + serviceJob)
    private lateinit var repository: VibeRepository

    private var liveSyncJob: Job? = null
    private var activeCoupleId: String? = null
    private var activeVibesRef: DatabaseReference? = null
    private var activeMembersDataRef: DatabaseReference? = null
    private var vibesListener: ValueEventListener? = null
    private var membersListener: ValueEventListener? = null

    companion object {
        const val CHANNEL_ID = "couples_vibe_sync_channel"
        const val NOTIFICATION_ID = 9988

        fun startService(context: Context) {
            val intent = Intent(context, VibeForegroundService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.e("VibeForegroundService", "Could not start service: ${e.message}")
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        repository = VibeRepository(applicationContext)
        createNotificationChannel()
        startForegroundServiceNotification()
        startFirebaseLiveSync()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (liveSyncJob == null || liveSyncJob?.isActive == false) {
            startFirebaseLiveSync()
        }
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Couples Vibe Live Sync",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Maintains realtime home screen widget sync with partner"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundServiceNotification() {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Couples Vibe")
            .setContentText("Live widget sync active")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun startFirebaseLiveSync() {
        liveSyncJob?.cancel()
        liveSyncJob = scope.launch {
            try {
                val uid = repository.ensureAuthenticated()
                if (uid.isEmpty()) return@launch

                repository.observeUserCoupleId().collect { coupleId ->
                    if (!coupleId.isNullOrEmpty() && coupleId != activeCoupleId) {
                        attachTargetedListeners(coupleId)
                    } else if (coupleId.isNullOrEmpty()) {
                        cleanupListeners()
                    }
                }
            } catch (e: Exception) {
                Log.e("VibeForegroundService", "Error in live sync flow", e)
            }
        }
    }

    /**
     * Attaches laser-targeted listeners to:
     * 1. couples/{coupleId}/currentVibes: Strictly vibe state (no moments, minimal payload)
     * 2. couples/{coupleId}/membersData: Only changes if partner edits their display name
     */
    private fun attachTargetedListeners(coupleId: String) {
        cleanupListeners()

        val database = FirebaseDatabase.getInstance(CouplesVibeApp.DATABASE_URL)
        val vibesRef = database.getReference("couples/$coupleId/currentVibes")
        val membersDataRef = database.getReference("couples/$coupleId/membersData")

        activeVibesRef = vibesRef
        activeMembersDataRef = membersDataRef
        activeCoupleId = coupleId

        // 1. Current Vibes Listener (High efficiency, targeted)
        val vListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if (!snapshot.exists()) return

                try {
                    val myUid = repository.currentUid
                    val partnerId = snapshot.children.firstOrNull { it.key != myUid }?.key

                    val myVibesList = mutableListOf<String>()
                    snapshot.child("$myUid/vibes").children.forEach { v ->
                        v.getValue(String::class.java)?.let { myVibesList.add(it) }
                    }

                    val partnerVibesList = mutableListOf<String>()
                    if (partnerId != null) {
                        snapshot.child("$partnerId/vibes").children.forEach { v ->
                            v.getValue(String::class.java)?.let { partnerVibesList.add(it) }
                        }
                    }

                    val partnerUpdatedAt = if (partnerId != null) {
                        snapshot.child("$partnerId/updatedAt").getValue(Long::class.java) ?: 0L
                    } else 0L

                    val newMyVibe = myVibesList.firstOrNull() ?: ""
                    val newPartnerVibe = partnerVibesList.firstOrNull() ?: ""

                    // --- STRICT STATE DIFFING ---
                    // Avoid unnecessary CPU cycles, DataStore writes, and Glance IPC if state hasn't changed.
                    val prefs = getSharedPreferences("couples_widget_state", Context.MODE_PRIVATE)
                    val lastMyVibe = prefs.getString("my_vibes", "") ?: ""
                    val lastPartnerVibe = prefs.getString("partner_vibes", "") ?: ""
                    val lastPartnerUpdatedAt = prefs.getLong("partner_updated_at", 0L)

                    val hasChanged = (newMyVibe != lastMyVibe) ||
                            (newPartnerVibe != lastPartnerVibe) ||
                            (partnerUpdatedAt != lastPartnerUpdatedAt)

                    if (!hasChanged) {
                        // Exact match — zero work required, return to dormant state immediately
                        return
                    }

                    // Update memory-cached SharedPreferences asynchronously
                    prefs.edit()
                        .putString("couple_id", coupleId)
                        .putString("my_vibes", newMyVibe)
                        .putString("partner_vibes", newPartnerVibe)
                        .putLong("partner_updated_at", partnerUpdatedAt)
                        .apply()

                    // Update Glance Widget asynchronously
                    scope.launch {
                        try {
                            val manager = GlanceAppWidgetManager(applicationContext)
                            val glanceIds = manager.getGlanceIds(CoupleWidget::class.java)
                            if (glanceIds.isEmpty()) return@launch // No widget placed on home screen

                            val partnerName = prefs.getString("partner_name", "Partner") ?: "Partner"

                            glanceIds.forEach { glanceId ->
                                updateAppWidgetState(applicationContext, glanceId) { p ->
                                    p[PREF_MY_VIBES] = newMyVibe
                                    p[PREF_PARTNER_VIBES] = newPartnerVibe
                                    p[PREF_PARTNER_NAME] = partnerName
                                    p[PREF_COUPLE_ID] = coupleId
                                }
                                CoupleWidget().update(applicationContext, glanceId)
                            }
                        } catch (e: Exception) {
                            Log.e("VibeForegroundService", "Error updating Glance widget", e)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("VibeForegroundService", "Error processing vibe update", e)
                }
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e("VibeForegroundService", "Vibes listener cancelled: ${error.message}")
            }
        }

        // 2. Members Data Listener (Infrequent: only fires if partner updates display name)
        val mListener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if (!snapshot.exists()) return

                try {
                    val myUid = repository.currentUid
                    val partnerId = snapshot.children.firstOrNull { it.key != myUid }?.key ?: return
                    val partnerName = snapshot.child("$partnerId/displayName").getValue(String::class.java) ?: "Partner"

                    val prefs = getSharedPreferences("couples_widget_state", Context.MODE_PRIVATE)
                    val lastPartnerName = prefs.getString("partner_name", "") ?: ""

                    if (partnerName != lastPartnerName) {
                        prefs.edit().putString("partner_name", partnerName).apply()

                        scope.launch {
                            try {
                                val manager = GlanceAppWidgetManager(applicationContext)
                                val glanceIds = manager.getGlanceIds(CoupleWidget::class.java)
                                if (glanceIds.isEmpty()) return@launch

                                glanceIds.forEach { glanceId ->
                                    updateAppWidgetState(applicationContext, glanceId) { p ->
                                        p[PREF_PARTNER_NAME] = partnerName
                                    }
                                    CoupleWidget().update(applicationContext, glanceId)
                                }
                            } catch (e: Exception) {
                                Log.e("VibeForegroundService", "Error updating partner name on widget", e)
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e("VibeForegroundService", "Error processing member data", e)
                }
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e("VibeForegroundService", "Members listener cancelled: ${error.message}")
            }
        }

        vibesRef.addValueEventListener(vListener)
        membersDataRef.addValueEventListener(mListener)

        vibesListener = vListener
        membersListener = mListener
    }

    private fun cleanupListeners() {
        try {
            vibesListener?.let { activeVibesRef?.removeEventListener(it) }
            membersListener?.let { activeMembersDataRef?.removeEventListener(it) }
        } catch (e: Exception) {
            Log.w("VibeForegroundService", "Error removing listeners", e)
        } finally {
            vibesListener = null
            membersListener = null
            activeVibesRef = null
            activeMembersDataRef = null
            activeCoupleId = null
        }
    }

    override fun onDestroy() {
        cleanupListeners()
        liveSyncJob?.cancel()
        serviceJob.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
