"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import FacebookLogin from "@greatsumini/react-facebook-login";
import { useAppDispatch } from "@/store/store";
import { socialLoginThunk } from "@/store/slices/authSlice";
import { FcGoogle } from "react-icons/fc";
import { FaFacebookF } from "react-icons/fa6";

export default function SocialLogin() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleSocialResult = async (
    thunkResult: Awaited<ReturnType<typeof dispatch>>
  ) => {
    if (socialLoginThunk.fulfilled.match(thunkResult)) {
      toast.success("Signed in successfully!");
      router.push("/dashboard");
    } else {
      const msg = (thunkResult.payload as string) ?? "Social login failed";
      toast.error(msg);
    }
  };

  const handleGoogle = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      toast.error("Google login failed — no credential received");
      return;
    }
    const result = await dispatch(
      socialLoginThunk({ provider: "google", credential: credentialResponse.credential })
    );
    handleSocialResult(result);
  };

  const handleFacebook = async (response: { accessToken?: string }) => {
    if (!response.accessToken) {
      toast.error("Facebook login failed — no access token received");
      return;
    }
    const result = await dispatch(
      socialLoginThunk({ provider: "facebook", accessToken: response.accessToken })
    );
    handleSocialResult(result);
  };

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";

  const isGoogleConfigured =
    Boolean(googleClientId) &&
    googleClientId !== "your_google_client_id" &&
    !googleClientId.includes("your_google");

  const isFacebookConfigured =
    Boolean(facebookAppId) &&
    facebookAppId !== "your_facebook_app_id" &&
    !facebookAppId.includes("your_facebook");

  return (
    <div className="flex flex-col md:flex-row gap-3 w-full">
      {/* ── Google ─────────────────────────────────────────────────────────── */}
      {isGoogleConfigured ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => toast.error("Google login failed")}
              useOneTap={false}
              theme="outline"
              size="large"
              width="100%"
            />
          </div>
        </GoogleOAuthProvider>
      ) : (
        <button
          type="button"
          onClick={() =>
            toast.error(
              "Google Login is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your environment variables."
            )
          }
          className="w-full h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center justify-center gap-3 font-medium text-slate-700 transition cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <FcGoogle className="text-xl" />
          Continue with Google
        </button>
      )}

      {/* ── Facebook ───────────────────────────────────────────────────────── */}
      {isFacebookConfigured ? (
        <FacebookLogin
          appId={facebookAppId}
          autoLoad={false}
          fields="name,email,picture"
          onSuccess={handleFacebook}
          onFail={() => toast.error("Facebook login failed")}
          render={(renderProps: { onClick?: () => void; isDisabled?: boolean }) => (
            <button
              type="button"
              onClick={renderProps.onClick}
              disabled={renderProps.isDisabled}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-3 bg-[#1877F2] text-white hover:bg-[#166FE5] transition shadow-sm font-medium px-4 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
            >
              <FaFacebookF className="text-lg" />
              Continue with Facebook
            </button>
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() =>
            toast.error(
              "Facebook Login is not configured. Please add NEXT_PUBLIC_FACEBOOK_APP_ID to your environment variables."
            )
          }
          className="w-full h-12 rounded-xl bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center gap-3 font-medium transition cursor-pointer shadow-sm active:scale-[0.99]"
        >
          <FaFacebookF className="text-lg" />
          Continue with Facebook
        </button>
      )}
    </div>
  );
}
