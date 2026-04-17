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
            .from('user_biometrics' as any)
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

            const { error } = await supabase
                .from('user_biometrics' as any)
                .insert({
                    user_id: user.id,
                    credential_id: result.credentialId,
                    public_key: result.publicKey,
                    device_name: deviceName,
                })
                .select()
                .single();

            if (error) throw error;

            localStorage.setItem('bb_biometric_id', result.credentialId);
            localStorage.setItem('bb_biometric_email', user.email || '');

            toast.success('Fingerprint registered successfully!');
            return true;
        } catch (error: any) {
            console.error('Biometric registration error:', error);
            if (error.name !== 'NotAllowedError') {
                toast.error('Failed to register fingerprint: ' + error.message);
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const removeBiometric = async (id: string, credentialId: string) => {
        const { error } = await supabase
            .from('user_biometrics' as any)
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

        if (!credId) {
            toast.error('No biometric registration found on this device');
            return false;
        }

        setLoading(true);

        try {
            const { data: beginData, error: beginError } = await supabase.functions.invoke('biometric-login', {
                body: {
                    action: 'begin',
                    credentialId: credId,
                },
            });

            if (beginError) throw beginError;
            if (!beginData?.challenge || !beginData?.state || !beginData?.rpId) {
                throw new Error(beginData?.error || 'Unable to start biometric login');
            }

            const assertion = await authenticateBiometric({
                credentialId: credId,
                challenge: beginData.challenge,
                rpId: beginData.rpId,
                timeout: beginData.timeout,
            });

            const { data: finishData, error: finishError } = await supabase.functions.invoke('biometric-login', {
                body: {
                    action: 'finish',
                    credentialId: credId,
                    state: beginData.state,
                    assertion,
                },
            });

            if (finishError) throw finishError;
            if (!finishData?.tokenHash) {
                throw new Error(finishData?.error || 'Unable to complete biometric login');
            }

            const { error: verifyError } = await supabase.auth.verifyOtp({
                token_hash: finishData.tokenHash,
                type: finishData.type || 'magiclink',
            });

            if (verifyError) throw verifyError;

            toast.success('Fingerprint login successful!');
            return true;
        } catch (error: any) {
            console.error('Biometric authentication error:', error);
            if (error.name !== 'NotAllowedError') {
                toast.error(error.message || 'Biometric authentication failed');
            }
            return false;
        } finally {
            setLoading(false);
        }
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
