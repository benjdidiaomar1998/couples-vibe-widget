package com.couples.vibe.widget

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.Button
import androidx.glance.ButtonDefaults
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.ActionParameters
import androidx.glance.action.actionParametersOf
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.currentState
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.couples.vibe.data.VibeRepository
import com.couples.vibe.data.model.VibeCatalog
import com.couples.vibe.ui.theme.Rose500
import com.couples.vibe.ui.theme.Stone100
import com.couples.vibe.ui.theme.Stone500
import com.couples.vibe.ui.theme.Stone800
import com.couples.vibe.ui.theme.Stone900
import kotlinx.coroutines.flow.firstOrNull

val VibeKey = ActionParameters.Key<String>("vibe_id")

val PREF_MY_VIBES = stringPreferencesKey("my_vibes")
val PREF_PARTNER_VIBES = stringPreferencesKey("partner_vibes")
val PREF_PARTNER_NAME = stringPreferencesKey("partner_name")
val PREF_COUPLE_ID = stringPreferencesKey("couple_id")

class SendVibeActionCallback : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        val vibeId = parameters[VibeKey] ?: return

        // 1. INSTANT GLANCE DATASTORE UPDATE (Single Vibe Mode - Replaces any previous vibe!)
        val manager = GlanceAppWidgetManager(context)
        val glanceIds = manager.getGlanceIds(CoupleWidget::class.java)

        glanceIds.forEach { id ->
            updateAppWidgetState(context, id) { prefs ->
                prefs[PREF_MY_VIBES] = vibeId // Single vibe only! No stacking!
            }
            CoupleWidget().update(context, id)
        }

        // Also update local SharedPreferences fallback
        val prefs = context.getSharedPreferences("couples_widget_state", Context.MODE_PRIVATE)
        prefs.edit().putString("my_vibes", vibeId).apply()

        // 2. BACKGROUND FIREBASE SYNC (Sends single vibe to partner)
        val repository = VibeRepository(context)
        try {
            var coupleId = prefs.getString("couple_id", "") ?: ""
            if (coupleId.isEmpty()) {
                coupleId = repository.observeUserCoupleId().firstOrNull() ?: ""
            }

            if (coupleId.isNotEmpty()) {
                repository.sendUserVibes(coupleId, listOf(vibeId))
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

class CoupleWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = currentState<Preferences>()
            val fallbackPrefs = context.getSharedPreferences("couples_widget_state", Context.MODE_PRIVATE)

            val myVibesRaw = prefs[PREF_MY_VIBES] ?: fallbackPrefs.getString("my_vibes", "") ?: ""
            val partnerVibesRaw = prefs[PREF_PARTNER_VIBES] ?: fallbackPrefs.getString("partner_vibes", "") ?: ""
            val partnerName = prefs[PREF_PARTNER_NAME] ?: fallbackPrefs.getString("partner_name", "Partner") ?: "Partner"

            val myVibeIds = if (myVibesRaw.isNotEmpty()) myVibesRaw.split(",") else emptyList()
            val partnerVibeIds = if (partnerVibesRaw.isNotEmpty()) partnerVibesRaw.split(",") else emptyList()

            val myEmoji = if (myVibeIds.isNotEmpty()) {
                VibeCatalog.getEmoji(myVibeIds.first())
            } else "💭"

            val partnerEmoji = if (partnerVibeIds.isNotEmpty()) {
                VibeCatalog.getEmoji(partnerVibeIds.first())
            } else "😴"

            val myLabel = if (myVibeIds.isNotEmpty()) {
                VibeCatalog.getLabel(myVibeIds.first())
            } else "No vibe"

            val partnerLabel = if (partnerVibeIds.isNotEmpty()) {
                VibeCatalog.getLabel(partnerVibeIds.first())
            } else "Waiting"

            Column(
                modifier = GlanceModifier
                    .fillMaxSize()
                    .background(ColorProvider(Stone900))
                    .padding(8.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalAlignment = Alignment.Top
            ) {
                // Top Status Card: YOU vs PARTNER (Big, clear displayed vibes)
                Row(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .background(ColorProvider(Stone800))
                        .padding(vertical = 6.dp, horizontal = 10.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // YOU Column
                    Column(
                        modifier = GlanceModifier.defaultWeight(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "YOU",
                            style = TextStyle(
                                color = ColorProvider(Stone500),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            )
                        )
                        Spacer(modifier = GlanceModifier.height(1.dp))
                        Text(
                            text = myEmoji,
                            style = TextStyle(fontSize = 34.sp, textAlign = TextAlign.Center)
                        )
                        Spacer(modifier = GlanceModifier.height(1.dp))
                        Text(
                            text = myLabel,
                            style = TextStyle(
                                color = ColorProvider(Stone100),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            ),
                            maxLines = 1
                        )
                    }

                    // Center Heart divider
                    Text(
                        text = "❤️",
                        style = TextStyle(fontSize = 12.sp)
                    )

                    // PARTNER Column
                    Column(
                        modifier = GlanceModifier.defaultWeight(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = partnerName.uppercase(),
                            style = TextStyle(
                                color = ColorProvider(Rose500),
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold
                            ),
                            maxLines = 1
                        )
                        Spacer(modifier = GlanceModifier.height(1.dp))
                        Text(
                            text = partnerEmoji,
                            style = TextStyle(fontSize = 34.sp, textAlign = TextAlign.Center)
                        )
                        Spacer(modifier = GlanceModifier.height(1.dp))
                        Text(
                            text = partnerLabel,
                            style = TextStyle(
                                color = ColorProvider(Stone100),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center
                            ),
                            maxLines = 1
                        )
                    }
                }

                Spacer(modifier = GlanceModifier.height(6.dp))

                // ALL 17 VIBES IN 3 SLEEK COMPACT ROWS
                val allVibes = VibeCatalog.items
                val currentMyVibeId = myVibeIds.firstOrNull() ?: ""

                val rows = listOf(
                    allVibes.subList(0, 6),   // 6 items: Loved, Cuddle, Kiss, Miss You, Need Hug, Excited
                    allVibes.subList(6, 12),  // 6 items: Happy (😊), Playful, Silly, Sleepy, Peaceful, Tired
                    allVibes.subList(12, 17)  // 5 items: Chill, Busy, Focused, Hungry, Thinking of You
                )

                rows.forEach { rowItems ->
                    Row(
                        modifier = GlanceModifier.fillMaxWidth().padding(vertical = 1.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        rowItems.forEach { item ->
                            val isSelected = (currentMyVibeId == item.id)
                            val btnBgColor = if (isSelected) Rose500 else Color(0x33F43F5E)

                            Button(
                                text = item.emoji,
                                onClick = actionRunCallback<SendVibeActionCallback>(
                                    actionParametersOf(VibeKey to item.id)
                                ),
                                modifier = GlanceModifier
                                    .defaultWeight()
                                    .height(28.dp)
                                    .padding(horizontal = 1.dp),
                                colors = ButtonDefaults.buttonColors(
                                    backgroundColor = ColorProvider(btnBgColor),
                                    contentColor = ColorProvider(Stone100)
                                )
                            )
                        }
                    }
                }
            }
        }
    }
}
