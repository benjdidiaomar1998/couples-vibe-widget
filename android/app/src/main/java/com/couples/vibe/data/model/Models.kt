package com.couples.vibe.data.model

import com.google.firebase.database.IgnoreExtraProperties
import com.google.firebase.database.PropertyName

@IgnoreExtraProperties
data class UserProfile(
    var uid: String = "",
    var displayName: String = "",
    var coupleId: String? = null
)

@IgnoreExtraProperties
data class MemberData(
    var uid: String = "",
    var displayName: String = "",
    var avatarBg: String = "#F43F5E"
)

@IgnoreExtraProperties
data class UserVibeState(
    var vibes: List<String> = emptyList(),
    var updatedAt: Long = 0L
)

@IgnoreExtraProperties
data class Couple(
    var id: String = "",
    var members: Map<String, Boolean> = emptyMap(),
    var membersData: Map<String, MemberData> = emptyMap(),
    var currentVibes: Map<String, UserVibeState> = emptyMap(),
    var createdAt: Long = 0L
)

@IgnoreExtraProperties
data class Moment(
    var id: String = "",
    var uid: String = "",
    var senderName: String = "",
    var vibes: List<String> = emptyList(),
    var createdAt: Long = 0L
)

@IgnoreExtraProperties
data class PairingCode(
    var code: String = "",
    var creatorUid: String = "",
    var createdAt: Long = 0L,
    var expiresAt: Long = 0L,
    var usedBy: String? = null
)

data class VibeCatalogItem(
    val id: String,
    val emoji: String,
    val label: String,
    val category: String
)

object VibeCatalog {
    val items: List<VibeCatalogItem> = listOf(
        // Affection
        VibeCatalogItem("loved", "❤️", "Loved", "Affection"),
        VibeCatalogItem("cuddle", "🥰", "Cuddle", "Affection"),
        VibeCatalogItem("kiss", "😘", "Kiss", "Affection"),
        VibeCatalogItem("miss_you", "🥺", "Miss You", "Affection"),
        VibeCatalogItem("need_hug", "🫂", "Need Hug", "Affection"),
        
        // Energy & Fun
        VibeCatalogItem("excited", "🔥", "Excited", "Energy"),
        VibeCatalogItem("happy", "😊", "Happy", "Energy"),
        VibeCatalogItem("playful", "😜", "Playful", "Energy"),
        VibeCatalogItem("silly", "🤪", "Silly", "Energy"),
        
        // Calming & Rest
        VibeCatalogItem("sleepy", "😴", "Sleepy", "Rest"),
        VibeCatalogItem("peaceful", "☁️", "Peaceful", "Rest"),
        VibeCatalogItem("tired", "🥱", "Tired", "Rest"),
        VibeCatalogItem("chill", "☕", "Chill", "Rest"),
        
        // Work & Day
        VibeCatalogItem("busy", "💻", "Busy", "Day"),
        VibeCatalogItem("focused", "🎯", "Focused", "Day"),
        VibeCatalogItem("hungry", "🍕", "Hungry", "Day"),
        VibeCatalogItem("thinking_of_you", "💭", "Thinking of You", "Day")
    )

    private val map = items.associateBy { it.id }

    fun find(id: String): VibeCatalogItem? = map[id]

    fun getEmoji(id: String): String = map[id]?.emoji ?: "😊"

    fun getLabel(id: String): String = map[id]?.label ?: id
}
