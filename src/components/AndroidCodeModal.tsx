import React, { useState } from 'react';
import { X, Copy, Check, Code, FileCode, Shield, Layers } from 'lucide-react';

interface AndroidCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidCodeModal: React.FC<AndroidCodeModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<'glance' | 'receiver' | 'repo' | 'rules' | 'viewmodel'>('glance');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const codeSnippets = {
    glance: `package com.couples.vibewidget.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.couples.vibewidget.MainActivity
import com.couples.vibewidget.data.models.CoupleState

/**
 * State-driven Jetpack Glance Widget.
 * No continuous rendering loop or 60fps polling. Updates only when Firebase state changes.
 */
class CoupleWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Read cached couple state from DataStore
        val coupleState = CoupleWidgetStateDefinition.getState(context)

        provideContent {
            GlanceTheme {
                WidgetContent(coupleState)
            }
        }
    }

    @Composable
    private fun WidgetContent(state: CoupleState) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(12.dp)
                .background(GlanceTheme.colors.surface)
                .clickable(actionStartActivity<MainActivity>())
        ) {
            // Header: "❤️ OUR VIBES"
            Row(
                modifier = GlanceModifier.fillMaxWidth().padding(bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "❤️ OUR VIBES",
                    style = TextStyle(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = GlanceTheme.colors.onSurface
                    )
                )
            }

            // 2-Column Split: ME vs PARTNER
            Row(
                modifier = GlanceModifier.defaultWeight().fillMaxWidth()
            ) {
                // Column 1: ME
                Column(
                    modifier = GlanceModifier.defaultWeight().padding(4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "ME",
                        style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    )
                    Spacer(GlanceModifier.height(4.dp))
                    Text(
                        text = state.myVibes.joinToString(" ") { it.emoji },
                        style = TextStyle(fontSize = 20.sp)
                    )
                    Text(
                        text = state.myVibes.joinToString(", ") { it.name },
                        style = TextStyle(fontSize = 10.sp, color = GlanceTheme.colors.onSurfaceVariant)
                    )
                }

                // Column 2: PARTNER
                Column(
                    modifier = GlanceModifier.defaultWeight().padding(4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = state.partnerName.ifEmpty { "PARTNER" },
                        style = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                    )
                    Spacer(GlanceModifier.height(4.dp))
                    Text(
                        text = state.partnerVibes.joinToString(" ") { it.emoji }.ifEmpty { "😴" },
                        style = TextStyle(fontSize = 20.sp)
                    )
                    Text(
                        text = state.partnerVibes.joinToString(", ") { it.name }.ifEmpty { "No vibe yet" },
                        style = TextStyle(fontSize = 10.sp, color = GlanceTheme.colors.onSurfaceVariant)
                    )
                }
            }

            // Footer Button: "✨ SEND VIBE"
            Box(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .padding(top = 4.dp)
                    .background(GlanceTheme.colors.primary)
                    .clickable(actionStartActivity<MainActivity>()),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "✨ SEND VIBE",
                    style = TextStyle(
                        color = GlanceTheme.colors.onPrimary,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    ),
                    modifier = GlanceModifier.padding(vertical = 6.dp)
                )
            }
        }
    }
}`,

    receiver: `package com.couples.vibewidget.widget

import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver

class CoupleWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CoupleWidget()
}`,

    repo: `package com.couples.vibewidget.data.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.*
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class VibeRepository @Inject constructor(
    private val auth: FirebaseAuth,
    private val database: FirebaseDatabase,
    private val widgetUpdater: CoupleWidgetUpdater
) {
    private val currentUid: String get() = auth.currentUser?.uid ?: ""

    /**
     * Realtime Database listener flow.
     * Subscribes to /couples/{coupleId}/currentVibes
     */
    fun observeCoupleVibes(coupleId: String): Flow<Map<String, Any>> = callbackFlow {
        val ref = database.getReference("couples/$coupleId/currentVibes")
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val data = snapshot.value as? Map<String, Any> ?: emptyMap()
                trySend(data)
                // Trigger lightweight widget update only when data actually changes
                widgetUpdater.updateAllWidgets()
            }

            override fun onCancelled(error: DatabaseError) {
                close(error.toException())
            }
        }
        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    /**
     * Send multiple vibes in one single atomic commit.
     */
    suspend fun sendVibes(coupleId: String, vibeIds: List<String>) {
        val ref = database.getReference("couples/$coupleId/currentVibes/$currentUid")
        val payload = mapOf(
            "vibes" to vibeIds.associateWith { true },
            "updatedAt" to ServerValue.TIMESTAMP
        )
        ref.setValue(payload).await()
    }
}`,

    rules: `{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    "couples": {
      "$coupleId": {
        // Read only permitted if user's authenticated UID is an active member
        ".read": "auth != null && data.child('members/' + auth.uid).val() === true",

        "members": {
          ".write": "auth != null && (!data.exists() || data.child(auth.uid).val() === true)"
        },

        "currentVibes": {
          "$memberId": {
            // A user can ONLY write to their own current vibe state
            ".write": "auth != null && auth.uid === $memberId && root.child('couples/' + $coupleId + '/members/' + auth.uid).val() === true"
          }
        },

        "vibeHistory": {
          "$eventId": {
            // Can only record events if you are the sender and a couple member
            ".write": "auth != null && newData.child('senderId').val() === auth.uid && root.child('couples/' + $coupleId + '/members/' + auth.uid).val() === true"
          }
        }
      }
    },
    "pairingCodes": {
      "$code": {
        // Any authenticated user can read code to validate connection
        ".read": "auth != null",
        // Only creator can issue code; single-use validation server-side
        ".write": "auth != null && (!data.exists() && newData.child('creatorId').val() === auth.uid || data.child('creatorId').val() === auth.uid)"
      }
    }
  }
}`,

    viewmodel: `package com.couples.vibewidget.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.couples.vibewidget.data.repository.VibeRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val myVibes: List<String> = emptyList(),
    val partnerVibes: List<String> = emptyList(),
    val partnerName: String = "",
    val isConnected: Boolean = false,
    val isLoading: Boolean = false
)

class HomeViewModel(
    private val repository: VibeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    fun sendVibes(coupleId: String, vibes: List<String>) {
        viewModelScope.launch {
            repository.sendVibes(coupleId, vibes)
        }
    }
}`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippets[selectedFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="android-code-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
    >
      <div
        id="android-code-modal-container"
        className="w-full max-w-3xl bg-stone-900 text-stone-100 rounded-3xl shadow-2xl border border-stone-800 flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold">
                Native Android & Jetpack Glance Source Code
              </h2>
              <p className="text-[11px] text-stone-400">
                Standalone Android Studio project created in <span className="font-mono text-emerald-400">/android</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File Tabs */}
        <div className="px-5 py-2.5 bg-stone-950/80 border-b border-stone-800 flex space-x-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'glance', name: 'CoupleWidget.kt', icon: Layers },
            { id: 'receiver', name: 'CoupleWidgetReceiver.kt', icon: FileCode },
            { id: 'repo', name: 'VibeRepository.kt', icon: FileCode },
            { id: 'rules', name: 'database.rules.json', icon: Shield },
            { id: 'viewmodel', name: 'HomeViewModel.kt', icon: FileCode },
          ].map((file) => {
            const Icon = file.icon;
            return (
              <button
                key={file.id}
                onClick={() => setSelectedFile(file.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition whitespace-nowrap ${
                  selectedFile === file.id
                    ? 'bg-rose-500 text-white font-semibold'
                    : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{file.name}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-950 font-mono text-xs relative">
          <button
            onClick={handleCopy}
            className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-sans flex items-center space-x-1.5 border border-stone-700 shadow-md transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy File'}</span>
          </button>
          <pre className="text-stone-300 leading-relaxed overflow-x-auto pr-24">
            {codeSnippets[selectedFile]}
          </pre>
        </div>
      </div>
    </div>
  );
};
