package com.couples.vibe.ui.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.couples.vibe.data.VibeRepository
import com.couples.vibe.data.model.Couple
import com.couples.vibe.data.model.Moment
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class HomeUiState(
    val isLoading: Boolean = true,
    val currentUid: String = "",
    val myName: String = "",
    val showNameSetup: Boolean = false,
    val coupleId: String? = null,
    val couple: Couple? = null,
    val moments: List<Moment> = emptyList(),
    val isPaired: Boolean = false,
    val partnerName: String = "Partner",
    val partnerAvatarBg: String = "#8B5CF6",
    val myVibes: List<String> = emptyList(),
    val partnerVibes: List<String> = emptyList(),
    val partnerUpdatedAt: Long = 0L,
    val toastMessage: String? = null,
    val isVibeSelectorOpen: Boolean = false
)

class HomeViewModel(application: Application) : AndroidViewModel(application) {

    val repository = VibeRepository(application.applicationContext)

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private var coupleObserverJob: Job? = null
    private var momentsObserverJob: Job? = null

    init {
        initializeAuthAndData()
    }

    private fun initializeAuthAndData() {
        viewModelScope.launch {
            try {
                _uiState.update { it.copy(isLoading = true) }
                val uid = repository.ensureAuthenticated()
                val storedName = repository.getMyDisplayName()

                _uiState.update {
                    it.copy(
                        currentUid = uid,
                        myName = storedName,
                        showNameSetup = storedName.isEmpty()
                    )
                }

                // Observe coupleId changes from users/{uid}/coupleId
                repository.observeUserCoupleId().collect { coupleId ->
                    _uiState.update {
                        it.copy(
                            coupleId = coupleId,
                            isPaired = !coupleId.isNullOrEmpty()
                        )
                    }

                    if (!coupleId.isNullOrEmpty()) {
                        observeCoupleData(coupleId)
                    } else {
                        coupleObserverJob?.cancel()
                        momentsObserverJob?.cancel()
                        _uiState.update {
                            it.copy(
                                couple = null,
                                moments = emptyList(),
                                isLoading = false
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        toastMessage = "Connection error: ${e.localizedMessage}"
                    )
                }
            }
        }
    }

    private fun observeCoupleData(coupleId: String) {
        coupleObserverJob?.cancel()
        coupleObserverJob = viewModelScope.launch {
            repository.observeCouple(coupleId).collect { couple ->
                if (couple == null) {
                    _uiState.update { it.copy(isLoading = false) }
                    return@collect
                }

                val myUid = repository.currentUid
                val partnerId = couple.members.keys.firstOrNull { it != myUid }
                val partnerData = partnerId?.let { couple.membersData[it] }

                val myVibeState = couple.currentVibes[myUid]
                val partnerVibeState = partnerId?.let { couple.currentVibes[it] }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        couple = couple,
                        isPaired = true,
                        partnerName = partnerData?.displayName ?: "Partner",
                        partnerAvatarBg = partnerData?.avatarBg ?: "#8B5CF6",
                        myVibes = myVibeState?.vibes ?: emptyList(),
                        partnerVibes = partnerVibeState?.vibes ?: emptyList(),
                        partnerUpdatedAt = partnerVibeState?.updatedAt ?: 0L
                    )
                }
            }
        }

        momentsObserverJob?.cancel()
        momentsObserverJob = viewModelScope.launch {
            repository.observeMoments(coupleId).collect { momentsList ->
                _uiState.update { it.copy(moments = momentsList) }
            }
        }
    }

    fun openVibeSelector() {
        _uiState.update { it.copy(isVibeSelectorOpen = true) }
    }

    fun closeVibeSelector() {
        _uiState.update { it.copy(isVibeSelectorOpen = false) }
    }

    fun sendVibes(vibes: List<String>) {
        val coupleId = _uiState.value.coupleId ?: return
        viewModelScope.launch {
            try {
                repository.sendUserVibes(coupleId, vibes)
                val partner = _uiState.value.partnerName
                _uiState.update {
                    it.copy(
                        isVibeSelectorOpen = false,
                        toastMessage = "✨ Sent to $partner"
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(toastMessage = "Error sending vibe: ${e.localizedMessage}") }
            }
        }
    }

    suspend fun generatePairingCode(): String {
        return repository.generatePairingCode()
    }

    fun connectPairingCode(code: String, onComplete: (Boolean) -> Unit) {
        viewModelScope.launch {
            try {
                val newCouple = repository.connectPairingCode(code)
                _uiState.update {
                    it.copy(
                        coupleId = newCouple.id,
                        couple = newCouple,
                        isPaired = true,
                        toastMessage = "You're connected ❤️"
                    )
                }
                onComplete(true)
            } catch (e: Exception) {
                _uiState.update { it.copy(toastMessage = e.message ?: "Failed to connect") }
                onComplete(false)
            }
        }
    }

    fun unpair() {
        val coupleId = _uiState.value.coupleId ?: return
        viewModelScope.launch {
            try {
                repository.unpair(coupleId)
                _uiState.update {
                    it.copy(
                        coupleId = null,
                        couple = null,
                        isPaired = false,
                        toastMessage = "Disconnected from partner"
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(toastMessage = "Failed to disconnect: ${e.localizedMessage}") }
            }
        }
    }

    fun openNameSetup() {
        _uiState.update { it.copy(showNameSetup = true) }
    }

    fun saveName(name: String) {
        val clean = name.trim()
        if (clean.isEmpty()) return
        val currentCoupleId = _uiState.value.coupleId

        viewModelScope.launch {
            try {
                repository.updateDisplayName(clean, currentCoupleId)
                _uiState.update {
                    it.copy(
                        myName = clean,
                        showNameSetup = false,
                        toastMessage = "Name saved!"
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(toastMessage = "Could not save name: ${e.localizedMessage}") }
            }
        }
    }

    fun dismissToast() {
        _uiState.update { it.copy(toastMessage = null) }
    }
}
