package com.couples.vibe.data

import android.content.Context
import android.util.Log
import com.couples.vibe.data.model.*
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import java.security.SecureRandom

class VibeRepository(private val context: Context) {

    private val auth: FirebaseAuth = FirebaseAuth.getInstance()
    private val database: FirebaseDatabase = FirebaseDatabase.getInstance("https://couples-vibe-default-rtdb.europe-west1.firebasedatabase.app")

    val currentUid: String
        get() = auth.currentUser?.uid ?: ""

    val isAuthenticated: Boolean
        get() = auth.currentUser != null

    /**
     * Ensure the user is signed in with Firebase Authentication.
     * Uses anonymous authentication if not already signed in,
     * or allows email/Google sign-in.
     */
    suspend fun ensureAuthenticated(): String {
        val existing = auth.currentUser
        if (existing != null) {
            return existing.uid
        }
        val result = auth.signInAnonymously().await()
        val uid = result.user?.uid ?: throw IllegalStateException("Firebase Auth returned null user")
        
        // Initialize user record if not present
        val userRef = database.getReference("users/$uid")
        val snapshot = userRef.get().await()
        if (!snapshot.exists()) {
            userRef.setValue(
                mapOf(
                    "uid" to uid,
                    "displayName" to "",
                    "coupleId" to null
                )
            ).await()
        }
        return uid
    }

    /**
     * Get stored local or remote display name
     */
    suspend fun getMyDisplayName(): String {
        val uid = currentUid
        if (uid.isEmpty()) return ""
        val prefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
        val cached = prefs.getString("display_name", "") ?: ""
        if (cached.isNotEmpty()) return cached

        val snap = database.getReference("users/$uid/displayName").get().await()
        val remoteName = snap.getValue(String::class.java) ?: ""
        if (remoteName.isNotEmpty()) {
            prefs.edit().putString("display_name", remoteName).apply()
        }
        return remoteName
    }

    /**
     * Set user display name
     */
    suspend fun updateDisplayName(name: String, coupleId: String? = null) {
        val uid = currentUid
        if (uid.isEmpty()) return
        val cleanName = name.trim()
        if (cleanName.isEmpty()) return

        database.getReference("users/$uid/displayName").setValue(cleanName).await()

        val prefs = context.getSharedPreferences("user_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("display_name", cleanName).apply()

        if (!coupleId.isNullOrEmpty()) {
            database.getReference("couples/$coupleId/membersData/$uid/displayName").setValue(cleanName).await()
        }
    }

    /**
     * Observes the couple ID assigned to the authenticated user:
     * users/{currentUid}/coupleId
     */
    fun observeUserCoupleId(): Flow<String?> = callbackFlow {
        val uid = currentUid
        if (uid.isEmpty()) {
            trySend(null)
            close()
            return@callbackFlow
        }

        val ref = database.getReference("users/$uid/coupleId")
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val coupleId = snapshot.getValue(String::class.java)
                trySend(coupleId)
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e("VibeRepository", "Failed to observe coupleId: ${error.message}")
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    /**
     * Observes the couple node:
     * couples/{coupleId}
     * Emits real-time updates whenever either partner updates their vibe.
     */
    fun observeCouple(coupleId: String): Flow<Couple?> = callbackFlow {
        if (coupleId.isEmpty()) {
            trySend(null)
            close()
            return@callbackFlow
        }

        val ref = database.getReference("couples/$coupleId")
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                if (!snapshot.exists()) {
                    trySend(null)
                    return
                }

                try {
                    val id = snapshot.child("id").getValue(String::class.java) ?: coupleId
                    val createdAt = snapshot.child("createdAt").getValue(Long::class.java) ?: 0L

                    // Parse members
                    val membersMap = mutableMapOf<String, Boolean>()
                    snapshot.child("members").children.forEach { child ->
                        child.key?.let { membersMap[it] = child.getValue(Boolean::class.java) ?: true }
                    }

                    // Parse membersData
                    val membersDataMap = mutableMapOf<String, MemberData>()
                    snapshot.child("membersData").children.forEach { child ->
                        val mUid = child.key ?: return@forEach
                        val name = child.child("displayName").getValue(String::class.java) ?: "Partner"
                        val bg = child.child("avatarBg").getValue(String::class.java) ?: "#F43F5E"
                        membersDataMap[mUid] = MemberData(mUid, name, bg)
                    }

                    // Parse currentVibes atomically for each user
                    val currentVibesMap = mutableMapOf<String, UserVibeState>()
                    snapshot.child("currentVibes").children.forEach { child ->
                        val vUid = child.key ?: return@forEach
                        val vibesList = mutableListOf<String>()
                        child.child("vibes").children.forEach { v ->
                            v.getValue(String::class.java)?.let { vibesList.add(it) }
                        }
                        val updatedAt = child.child("updatedAt").getValue(Long::class.java) ?: 0L
                        currentVibesMap[vUid] = UserVibeState(vibesList, updatedAt)
                    }

                    val couple = Couple(
                        id = id,
                        members = membersMap,
                        membersData = membersDataMap,
                        currentVibes = currentVibesMap,
                        createdAt = createdAt
                    )

                    // Cache widget data in SharedPreferences for Glance App Widget
                    cacheWidgetState(couple)

                    trySend(couple)
                } catch (e: Exception) {
                    Log.e("VibeRepository", "Error parsing couple snapshot", e)
                }
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e("VibeRepository", "Firebase couple listener cancelled: ${error.message}")
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    /**
     * Send user vibes atomically to:
     * couples/{coupleId}/currentVibes/{currentUid}
     *
     * Alex writes to couples/{coupleId}/currentVibes/{alexUid}
     * Jordan writes to couples/{coupleId}/currentVibes/{jordanUid}
     *
     * Neither overwrites the partner's state! Concurrency safe.
     */
    suspend fun sendUserVibes(coupleId: String, vibeIds: List<String>) {
        val uid = currentUid
        if (uid.isEmpty() || coupleId.isEmpty()) return

        val userVibeRef = database.getReference("couples/$coupleId/currentVibes/$uid")
        val vibePayload = mapOf(
            "vibes" to vibeIds,
            "updatedAt" to ServerValue.TIMESTAMP
        )
        userVibeRef.setValue(vibePayload).await()

        // Also record historical moment under couples/{coupleId}/moments
        val momentRef = database.getReference("couples/$coupleId/moments").push()
        val userProfile = database.getReference("users/$uid").get().await()
        val senderName = userProfile.child("displayName").getValue(String::class.java) ?: "Me"

        val momentPayload = mapOf(
            "id" to (momentRef.key ?: ""),
            "uid" to uid,
            "senderName" to senderName,
            "vibes" to vibeIds,
            "createdAt" to ServerValue.TIMESTAMP
        )
        momentRef.setValue(momentPayload).await()
    }

    /**
     * Observe historical moments
     */
    fun observeMoments(coupleId: String): Flow<List<Moment>> = callbackFlow {
        if (coupleId.isEmpty()) {
            trySend(emptyList())
            close()
            return@callbackFlow
        }

        val ref = database.getReference("couples/$coupleId/moments")
            .orderByChild("createdAt")
            .limitToLast(50)

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val list = mutableListOf<Moment>()
                snapshot.children.forEach { child ->
                    val id = child.key ?: ""
                    val uid = child.child("uid").getValue(String::class.java) ?: ""
                    val senderName = child.child("senderName").getValue(String::class.java) ?: "Partner"
                    val vibes = mutableListOf<String>()
                    child.child("vibes").children.forEach { v ->
                        v.getValue(String::class.java)?.let { vibes.add(it) }
                    }
                    val createdAt = child.child("createdAt").getValue(Long::class.java) ?: 0L
                    list.add(Moment(id, uid, senderName, vibes, createdAt))
                }
                trySend(list.reversed())
            }

            override fun onCancelled(error: DatabaseError) {
                Log.e("VibeRepository", "Moments listener cancelled: ${error.message}")
            }
        }

        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    /**
     * Generates a 6-character human-readable pairing code (e.g. AMRR-PS)
     * Valid for 10 minutes.
     */
    suspend fun generatePairingCode(): String {
        val uid = currentUid
        if (uid.isEmpty()) throw IllegalStateException("Not authenticated")

        val chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        val random = SecureRandom()
        val part1 = (1..4).map { chars[random.nextInt(chars.length)] }.joinToString("")
        val part2 = (1..2).map { chars[random.nextInt(chars.length)] }.joinToString("")
        val code = "$part1-$part2"

        val now = System.currentTimeMillis()
        val expiresAt = now + (10 * 60 * 1000) // 10 minutes

        val payload = mapOf(
            "code" to code,
            "creatorUid" to uid,
            "createdAt" to now,
            "expiresAt" to expiresAt,
            "usedBy" to null
        )

        database.getReference("pairingCodes/$code").setValue(payload).await()
        return code
    }

    /**
     * Connects with a partner using their generated code.
     * Creates the couple node, updates both users' coupleId.
     */
    suspend fun connectPairingCode(rawCode: String): Couple {
        val uid = currentUid
        if (uid.isEmpty()) throw IllegalStateException("Not authenticated")

        val cleanCode = rawCode.trim().uppercase()
        val codeRef = database.getReference("pairingCodes/$cleanCode")
        val snapshot = codeRef.get().await()

        if (!snapshot.exists()) {
            throw IllegalArgumentException("Invalid pairing code. Please double check.")
        }

        val creatorUid = snapshot.child("creatorUid").getValue(String::class.java)
            ?: throw IllegalArgumentException("Malformed code.")
        val expiresAt = snapshot.child("expiresAt").getValue(Long::class.java) ?: 0L
        val usedBy = snapshot.child("usedBy").getValue(String::class.java)

        if (creatorUid == uid) {
            throw IllegalArgumentException("You cannot pair with your own code!")
        }
        if (usedBy != null) {
            throw IllegalArgumentException("This code has already been used.")
        }
        if (System.currentTimeMillis() > expiresAt) {
            throw IllegalArgumentException("This code has expired. Please generate a new one.")
        }

        // Generate unique couple ID
        val coupleId = "couple_${System.currentTimeMillis()}_${cleanCode.replace("-", "")}"

        // Fetch display names
        val creatorSnap = database.getReference("users/$creatorUid").get().await()
        val currentSnap = database.getReference("users/$uid").get().await()

        val creatorName = creatorSnap.child("displayName").getValue(String::class.java) ?: "Partner"
        val currentName = currentSnap.child("displayName").getValue(String::class.java) ?: "Me"

        // Build couple record
        val coupleData = mapOf(
            "id" to coupleId,
            "members" to mapOf(creatorUid to true, uid to true),
            "membersData" to mapOf(
                creatorUid to mapOf("uid" to creatorUid, "displayName" to creatorName, "avatarBg" to "#8B5CF6"),
                uid to mapOf("uid" to uid, "displayName" to currentName, "avatarBg" to "#F43F5E")
            ),
            "createdAt" to ServerValue.TIMESTAMP
        )

        // Atomic multi-path updates
        val updates = mutableMapOf<String, Any>()
        updates["couples/$coupleId"] = coupleData
        updates["users/$creatorUid/coupleId"] = coupleId
        updates["users/$uid/coupleId"] = coupleId
        updates["pairingCodes/$cleanCode/usedBy"] = uid

        database.reference.updateChildren(updates).await()

        return Couple(
            id = coupleId,
            members = mapOf(creatorUid to true, uid to true),
            membersData = mapOf(
                creatorUid to MemberData(creatorUid, creatorName, "#8B5CF6"),
                uid to MemberData(uid, currentName, "#F43F5E")
            ),
            createdAt = System.currentTimeMillis()
        )
    }

    /**
     * Unpair from current couple
     */
    suspend fun unpair(coupleId: String) {
        val uid = currentUid
        if (uid.isEmpty() || coupleId.isEmpty()) return

        val updates = mutableMapOf<String, Any?>()
        updates["users/$uid/coupleId"] = null
        database.reference.updateChildren(updates).await()

        // Clear local widget cache
        clearWidgetCache()
    }

    /**
     * Cache the couple's latest state to SharedPreferences
     * so Jetpack Glance can read it instantly without a network call.
     */
    private fun cacheWidgetState(couple: Couple) {
        val prefs = context.getSharedPreferences("couples_widget_state", Context.MODE_PRIVATE)
        val myUid = currentUid
        val partnerId = couple.members.keys.firstOrNull { it != myUid }

        val myVibes = couple.currentVibes[myUid]?.vibes ?: emptyList()
        val partnerVibes = partnerId?.let { couple.currentVibes[it]?.vibes } ?: emptyList()
        val partnerName = partnerId?.let { couple.membersData[it]?.displayName } ?: "Partner"
        val partnerUpdatedAt = partnerId?.let { couple.currentVibes[it]?.updatedAt } ?: 0L

        val newMyVibe = myVibes.firstOrNull() ?: ""
        val newPartnerVibe = partnerVibes.firstOrNull() ?: ""

        val lastMyVibe = prefs.getString("my_vibes", "") ?: ""
        val lastPartnerVibe = prefs.getString("partner_vibes", "") ?: ""
        val lastPartnerName = prefs.getString("partner_name", "") ?: ""
        val lastPartnerUpdatedAt = prefs.getLong("partner_updated_at", 0L)

        // Only write if state actually changed
        if (newMyVibe != lastMyVibe ||
            newPartnerVibe != lastPartnerVibe ||
            partnerName != lastPartnerName ||
            partnerUpdatedAt != lastPartnerUpdatedAt) {

            prefs.edit()
                .putString("couple_id", couple.id)
                .putString("my_vibes", newMyVibe)
                .putString("partner_vibes", newPartnerVibe)
                .putString("partner_name", partnerName)
                .putLong("partner_updated_at", partnerUpdatedAt)
                .apply()

            try {
                CoroutineScope(Dispatchers.IO).launch {
                    val manager = androidx.glance.appwidget.GlanceAppWidgetManager(context)
                    val glanceIds = manager.getGlanceIds(com.couples.vibe.widget.CoupleWidget::class.java)
                    glanceIds.forEach { glanceId ->
                        androidx.glance.appwidget.state.updateAppWidgetState(context, glanceId) { p ->
                            p[com.couples.vibe.widget.PREF_MY_VIBES] = newMyVibe
                            p[com.couples.vibe.widget.PREF_PARTNER_VIBES] = newPartnerVibe
                            p[com.couples.vibe.widget.PREF_PARTNER_NAME] = partnerName
                            p[com.couples.vibe.widget.PREF_COUPLE_ID] = couple.id
                        }
                        com.couples.vibe.widget.CoupleWidget().update(context, glanceId)
                    }
                }
            } catch (e: Exception) {
                Log.e("VibeRepository", "Error updating Glance widget: ${e.message}")
            }
        }
    }

    private fun clearWidgetCache() {
        context.getSharedPreferences("couples_widget_state", Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply()
    }
}
