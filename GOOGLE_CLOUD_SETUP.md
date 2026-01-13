# Google Cloud Project Setup for MemoVox

Follow these steps to configure a fresh Google Cloud project for authentication and Google Calendar integration.

## 1. Create Project
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the project dropdown (top left) → **New Project**.
3.  Name it `memovox-mobile` (or similar).
4.  Click **Create** and select the project.

## 2. Configure OAuth Consent Screen
1.  Go to **APIs & Services > OAuth consent screen**.
2.  **User Type:** Select **External** (so @gmail.com users can log in). Click **Create**.
3.  **App Information:**
    *   **App name:** MemoVox
    *   **User support email:** Your email.
    *   **Developer contact information:** Your email.
4.  **Scopes:**
    *   Click **Add or Remove Scopes**.
    *   Select `.../auth/userinfo.email` and `.../auth/userinfo.profile`.
    *   *Important for Calendar:* Manually add `https://www.googleapis.com/auth/calendar.events` and `https://www.googleapis.com/auth/calendar.readonly`.
5.  **Test Users:**
    *   Add your own email (`chinmaybehera...`) and your tester's email (`renukabehera95@gmail.com`).
6.  Click **Save and Continue** until finished.

## 3. Create Credentials (OAuth Client IDs)
You need to create 3 separate Client IDs. Go to **APIs & Services > Credentials** and click **+ CREATE CREDENTIALS > OAuth client ID**.

### A. Web Client ID (For Supabase)
1.  **Application type:** Web application.
2.  **Name:** `Web Client (Supabase)`.
3.  **Authorized redirect URIs:**
    *   You need your Supabase Project URL.
    *   Add: `https://<YOUR_SUPABASE_ID>.supabase.co/auth/v1/callback`
4.  Click **Create**.
5.  **COPY** the `Client ID` and `Client Secret`. You will need to put these into your **Supabase Dashboard** (Authentication > Providers > Google).

### B. Android Client ID
1.  **Application type:** Android.
2.  **Name:** `Android Client`.
3.  **Package name:** `com.memovox.app`.
4.  **SHA-1 Certificate Fingerprint:**
    *   *Development:* Run `npx expo credentials:manager` locally to get your local SHA-1.
    *   *Production:* Go to **Google Play Console > Release > Setup > App signing** and copy the **SHA-1 certificate fingerprint** from the "App signing key certificate".
5.  Click **Create**.
6.  **COPY** the `Client ID`.

### C. iOS Client ID
1.  **Application type:** iOS.
2.  **Name:** `iOS Client`.
3.  **Bundle ID:** `com.memovox.app`.
4.  Click **Create**.
5.  **COPY** the `Client ID`.

## 4. Updates Required in App
Once you have the new Client IDs, update your `.env` file (and EAS Secrets) with the new values:

```bash
# In .env
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=<New Android ID>
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=<New iOS ID>
EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB=<New Web ID>
```
