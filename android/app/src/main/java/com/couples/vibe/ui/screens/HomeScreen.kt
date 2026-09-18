package com.couples.vibe.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.couples.vibe.data.model.VibeCatalog
import com.couples.vibe.ui.theme.*

@Composable
fun HomeScreen(
    isPaired: Boolean,
    myName: String,
    partnerName: String,
    partnerAvatarBg: String,
    myVibes: List<String>,
    partnerVibes: List<String>,
    partnerUpdatedAt: Long,
    onOpenVibeSelector: () -> Unit,
    onNavigateToPairing: () -> Unit,
    onOpenNameSetup: (() -> Unit)? = null
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Calm Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Rose500),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Favorite,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Text(
                        text = "OUR VIBES",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Profile / Display Name Button
                    Surface(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { onOpenNameSetup?.invoke() },
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = if (myName.isNotBlank()) myName else "Set Name",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (myName.isNotBlank()) MaterialTheme.colorScheme.onSurface else Rose500
                            )
                            Icon(
                                imageVector = Icons.Default.Edit,
                                contentDescription = "Edit Name",
                                tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                                modifier = Modifier.size(12.dp)
                            )
                        }
                    }

                    IconButton(
                        onClick = onNavigateToPairing,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Link,
                            contentDescription = "Pairing",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            if (!isPaired) {
                // Not paired card
                UnpairedCard(
                    onNavigateToPairing = onNavigateToPairing,
                    onOpenNameSetup = onOpenNameSetup,
                    myName = myName
                )
            } else {
                // Paired: Two clean side-by-side columns: ME vs PARTNER
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Left Column: ME
                    VibeColumn(
                        modifier = Modifier.weight(1f),
                        title = "ME",
                        name = if (myName.isNotEmpty()) myName else "Me",
                        vibes = myVibes,
                        updatedAt = 0L,
                        isMe = true,
                        onCardClick = onOpenVibeSelector,
                        onEditNameClick = onOpenNameSetup
                    )

                    // Right Column: PARTNER
                    VibeColumn(
                        modifier = Modifier.weight(1f),
                        title = "PARTNER",
                        name = partnerName,
                        vibes = partnerVibes,
                        updatedAt = partnerUpdatedAt,
                        isMe = false,
                        onCardClick = null,
                        onEditNameClick = null
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Primary Action Button: SEND VIBE
                Button(
                    onClick = onOpenVibeSelector,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Rose500,
                        contentColor = Color.White
                    ),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 2.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "SEND VIBE",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
    }
}

@Composable
fun VibeColumn(
    modifier: Modifier = Modifier,
    title: String,
    name: String,
    vibes: List<String>,
    updatedAt: Long,
    isMe: Boolean,
    onCardClick: (() -> Unit)?,
    onEditNameClick: (() -> Unit)? = null
) {
    Card(
        modifier = modifier
            .fillMaxHeight()
            .then(
                if (onCardClick != null) Modifier.clickable { onCardClick() }
                else Modifier
            ),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Header: Category Title (ME / PARTNER) and Name
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = if (isMe && onEditNameClick != null) Modifier.clickable { onEditNameClick() } else Modifier
            ) {
                Text(
                    text = title,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                )
                Spacer(modifier = Modifier.height(2.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = name,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    if (isMe && onEditNameClick != null) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit name",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }

            // Center: Expressive Emojis & Labels
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier.weight(1f)
            ) {
                if (vibes.isEmpty()) {
                    Text(
                        text = if (isMe) "💭" else "😴",
                        fontSize = 44.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = if (isMe) "No vibe yet" else "Waiting for vibe",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f),
                        textAlign = TextAlign.Center
                    )
                } else {
                    val currentVibeId = vibes.first()
                    Text(
                        text = VibeCatalog.getEmoji(currentVibeId),
                        fontSize = 46.sp,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = VibeCatalog.getLabel(currentVibeId),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center
                    )
                }
            }

            // Footer: Timestamp
            if (updatedAt > 0L) {
                val timeAgo = formatTimeAgo(updatedAt)
                Text(
                    text = timeAgo,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.4f)
                )
            } else if (isMe) {
                Text(
                    text = "Tap to update",
                    fontSize = 11.sp,
                    color = Rose500,
                    fontWeight = FontWeight.Medium
                )
            } else {
                Spacer(modifier = Modifier.height(12.dp))
            }
        }
    }
}

@Composable
fun UnpairedCard(
    onNavigateToPairing: () -> Unit,
    onOpenNameSetup: (() -> Unit)? = null,
    myName: String = ""
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 40.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "❤️", fontSize = 48.sp)
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "Connect with your partner",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Share live moods and glances on each other's home screens.",
                fontSize = 13.sp,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(20.dp))

            if (myName.isBlank()) {
                OutlinedButton(
                    onClick = { onOpenNameSetup?.invoke() },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Rose500)
                ) {
                    Icon(imageVector = Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Set Your Name First")
                }
                Spacer(modifier = Modifier.height(12.dp))
            } else {
                Text(
                    text = "You are: $myName",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            Button(
                onClick = onNavigateToPairing,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Rose500)
            ) {
                Text("Pair Devices", fontWeight = FontWeight.SemiBold)
            }
        }
    }
}

fun formatTimeAgo(timestamp: Long): String {
    val diff = System.currentTimeMillis() - timestamp
    val mins = diff / (60 * 1000)
    return when {
        mins < 1 -> "Just now"
        mins < 60 -> "${mins}m ago"
        mins < 1440 -> "${mins / 60}h ago"
        else -> "Yesterday"
    }
}
