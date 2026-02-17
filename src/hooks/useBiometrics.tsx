import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { registerBiometric, authenticateBiometric, isWebAuthnSupported } from '@/utils/webauthn';
import { toast } from 'sonner';

export function useBiometrics() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const getBiometrics = async () => {
        if (!user) return [];
        const { data, error } = await supabase
            .from('user_biometrics')
            .select('*')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching biometrics:', error);
            return [];
        }
        return data;
    };

    const register = async (deviceName: string = 'Current Device') => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await registerBiometric(user.id, user.email || '');

            const { data: insertedData, error } = await supabase
                .from('user_biometrics')
                .insert({
                    user_id: user.id,
                    credential_id: result.credentialId,
                    public_key: result.publicKey,
                    device_name: deviceName,
                })
                .select()
                .single();

            if (error) throw error;

            // Store locally for login page
            localStorage.setItem('bb_biometric_id', result.credentialId);
            localStorage.setItem('bb_biometric_email', user.email || '');

            toast.success('Fingerprint registered successfully!');
            return true;
        } catch (error: any) {
            console.error('Biometric registration error:', error);
            if (error.name !== 'NotAllowedError') { // User cancelled
                toast.error('Failed to register fingerprint: ' + error.message);
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const removeBiometric = async (id: string, credentialId: string) => {
        const { error } = await supabase
            .from('user_biometrics')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to remove biometric');
            return false;
        }

        if (localStorage.getItem('bb_biometric_id') === credentialId) {
            localStorage.removeItem('bb_biometric_id');
            localStorage.removeItem('bb_biometric_email');
        }

        toast.success('Biometric removed');
        return true;
    };

    const loginWithBiometric = async () => {
        const credId = localStorage.getItem('bb_biometric_id');
        const email = localStorage.getItem('bb_biometric_email');

        if (!credId || !email) {
            toast.error('No biometric registration found on this device');
            return false;
        }

        try {
            const success = await authenticateBiometric(credId);
            if (success) {
                // Need to sign in via Supabase somehow.
                // For this demo, we'll assume the biometric validates the user
                // and we'll use a specific RPC or just notify that they should use password 
                // if we don't have a secure token exchange.
                // REAL Implementation: Custom Edge Function to verify signature and return JWT

                toast.success('Biometric verified! (Proceeding to login)');
                return { email }; // In a real app, we'd return a session
            }
        } catch (error: any) {
            if (error.name !== 'NotAllowedError') {
                toast.error('Biometric authentication failed');
            }
        }
        return false;
    };

    return {
        register,
        removeBiometric,
        getBiometrics,
        loginWithBiometric,
        loading,
        isSupported: isWebAuthnSupported(),
    };
}
