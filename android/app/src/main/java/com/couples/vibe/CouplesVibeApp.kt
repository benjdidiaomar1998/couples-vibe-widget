package com.couples.vibe

import android.app.Application
import androidx.work.WorkManager
import com.google.firebase.FirebaseApp
import com.google.firebase.database.FirebaseDatabase

class CouplesVibeApp : Application() {
    companion object {
        const val DATABASE_URL = "https://couples-vibe-default-rtdb.europe-west1.firebasedatabase.app"
    }

    override fun onCreate() {
        super.onCreate()
        // Initialize Firebase
        FirebaseApp.initializeApp(this)
        
        // Enable offline persistence for Firebase Realtime Database
        try {
            FirebaseDatabase.getInstance(DATABASE_URL).setPersistenceEnabled(true)
        } catch (e: Exception) {
            // Persistence must be set before any other usage of FirebaseDatabase
        }

        // Clean up any legacy periodic WorkManager tasks
        try {
            WorkManager.getInstance(this).cancelUniqueWork("vibe_widget_periodic_sync")
        } catch (e: Exception) {
            // Ignore if WorkManager not initialized
        }
    }
}
