package com.couples.vibe.fcm

import android.util.Log
import androidx.glance.appwidget.updateAll
import com.couples.vibe.data.VibeRepository
import com.couples.vibe.widget.CoupleWidget
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.firstOrNull
import kotlinx.coroutines.launch

class CoupleFirebaseMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d("CoupleFCM", "Received FCM data message: ${message.data}")

        // When a partner sends a vibe, this wake notification allows the Glance widget
        // to update even if the app was killed or backgrounded.
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val repository = VibeRepository(applicationContext)
                val coupleId = repository.observeUserCoupleId().firstOrNull()
                if (!coupleId.isNullOrEmpty()) {
                    repository.observeCouple(coupleId).firstOrNull()
                    CoupleWidget().updateAll(applicationContext)
                }
            } catch (e: Exception) {
                Log.e("CoupleFCM", "Error refreshing widget after FCM message", e)
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("CoupleFCM", "New FCM registration token: $token")
    }
}
