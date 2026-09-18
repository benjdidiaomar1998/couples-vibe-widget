package com.couples.vibe

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.couples.vibe.ui.screens.HomeScreen
import com.couples.vibe.ui.screens.MomentsScreen
import com.couples.vibe.ui.screens.PairingScreen
import com.couples.vibe.ui.screens.VibeSelectorBottomSheet
import com.couples.vibe.ui.theme.CouplesVibeTheme
import com.couples.vibe.ui.theme.Rose500
import com.couples.vibe.ui.theme.Stone900
import com.couples.vibe.ui.viewmodel.HomeViewModel

class MainActivity : ComponentActivity() {

    private val viewModel: HomeViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Handle intent action from widget
        handleIntent(intent)

        // Ensure live widget sync foreground service is running for closed-app updates
        com.couples.vibe.service.VibeForegroundService.startService(this)

        setContent {
            CouplesVibeTheme {
                val uiState by viewModel.uiState.collectAsState()
                var currentTab by remember { mutableStateOf("home") }
                var showPairingScreen by remember { mutableStateOf(false) }

                Scaffold(
                    bottomBar = {
                        if (!showPairingScreen) {
                            NavigationBar(
                                containerColor = MaterialTheme.colorScheme.surface,
                                tonalElevation = 3.dp,
                                modifier = Modifier.height(56.dp)
                            ) {
                                NavigationBarItem(
                                    selected = currentTab == "home",
                                    onClick = { currentTab = "home" },
                                    icon = {
                                        Icon(
                                            imageVector = Icons.Default.Favorite,
                                            contentDescription = "Vibes",
                                            tint = if (currentTab == "home") Rose500 else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    },
                                    label = {
                                        Text(
                                            "Vibes",
                                            fontSize = 10.sp,
                                            color = if (currentTab == "home") Rose500 else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                                        )
                                    }
                                )
                                NavigationBarItem(
                                    selected = currentTab == "moments",
                                    onClick = { currentTab = "moments" },
                                    icon = {
                                        Icon(
                                            imageVector = Icons.Default.AutoAwesome,
                                            contentDescription = "Moments",
                                            tint = if (currentTab == "moments") Rose500 else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    },
                                    label = {
                                        Text(
                                            "Moments",
                                            fontSize = 10.sp,
                                            color = if (currentTab == "moments") Rose500 else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                                        )
                                    }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(innerPadding)
                    ) {
                        if (showPairingScreen) {
                            PairingScreen(
                                isPaired = uiState.isPaired,
                                partnerName = uiState.partnerName,
                                onBack = { showPairingScreen = false },
                                onGenerateCode = { viewModel.generatePairingCode() },
                                onConnectCode = { code, onDone -> viewModel.connectPairingCode(code, onDone) },
                                onUnpair = { viewModel.unpair() }
                            )
                        } else {
                            when (currentTab) {
                                "home" -> HomeScreen(
                                    isPaired = uiState.isPaired,
                                    myName = uiState.myName,
                                    partnerName = uiState.partnerName,
                                    partnerAvatarBg = uiState.partnerAvatarBg,
                                    myVibes = uiState.myVibes,
                                    partnerVibes = uiState.partnerVibes,
                                    partnerUpdatedAt = uiState.partnerUpdatedAt,
                                    onOpenVibeSelector = { viewModel.openVibeSelector() },
                                    onNavigateToPairing = { showPairingScreen = true },
                                    onOpenNameSetup = { viewModel.openNameSetup() }
                                )
                                "moments" -> MomentsScreen(
                                    moments = uiState.moments,
                                    currentUid = uiState.currentUid
                                )
                            }
                        }

                        // One-time Name Setup Dialog on first app launch
                        if (uiState.showNameSetup) {
                            com.couples.vibe.ui.screens.NameSetupDialog(
                                initialName = uiState.myName,
                                onSave = { name -> viewModel.saveName(name) }
                            )
                        }

                        // Vibe Selector Bottom Sheet
                        if (uiState.isVibeSelectorOpen) {
                            VibeSelectorBottomSheet(
                                partnerName = uiState.partnerName,
                                initialSelectedVibes = uiState.myVibes,
                                onDismiss = { viewModel.closeVibeSelector() },
                                onSend = { vibes -> viewModel.sendVibes(vibes) }
                            )
                        }

                        // Toast Notification Banner
                        uiState.toastMessage?.let { msg ->
                            LaunchedEffect(msg) {
                                kotlinx.coroutines.delay(2500)
                                viewModel.dismissToast()
                            }
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopCenter)
                                    .padding(top = 16.dp)
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(Stone900.copy(alpha = 0.95f))
                                    .padding(horizontal = 16.dp, vertical = 10.dp)
                            ) {
                                Text(
                                    text = msg,
                                    color = Color.White,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        if (intent?.action == "com.couples.vibe.ACTION_OPEN_VIBE_SELECTOR") {
            viewModel.openVibeSelector()
        }
    }
}
