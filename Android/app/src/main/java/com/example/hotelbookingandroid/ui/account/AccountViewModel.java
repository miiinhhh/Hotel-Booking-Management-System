package com.example.hotelbookingandroid.ui.account;

import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;

import com.example.hotelbookingandroid.core.network.Resource;
import com.example.hotelbookingandroid.data.model.auth.AccountProfile;
import com.example.hotelbookingandroid.data.repository.AuthRepository;
import com.example.hotelbookingandroid.ui.common.BaseViewModel;

public class AccountViewModel extends BaseViewModel {
    private final AuthRepository repository = new AuthRepository();
    private final MediatorLiveData<Resource<AccountProfile>> profile = new MediatorLiveData<>();

    public LiveData<Resource<AccountProfile>> profile() { return profile; }

    public void load() {
        bind(profile, repository.profile());
    }

    public void logout() {
        repository.logout();
    }
}
