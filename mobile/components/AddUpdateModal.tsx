/**
 * Add Update Modal - Staff posts progress updates with images
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Card } from './ui';
import MediaUpload from './MediaUpload';
import { jobAPI } from '@/services';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';

interface AddUpdateModalProps {
    visible: boolean;
    onClose: () => void;
    jobId: string;
}

export default function AddUpdateModal({ visible, onClose, jobId }: AddUpdateModalProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [mediaUrls, setMediaUrls] = useState<string[]>([]);
    const [isVisibleToCustomer, setIsVisibleToCustomer] = useState(true);

    const mutation = useMutation({
        mutationFn: (data: any) => jobAPI.addJobUpdate(jobId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['job', jobId] });
            Alert.alert('Success', 'Update posted successfully!');
            setTitle('');
            setMessage('');
            setMediaUrls([]);
            onClose();
        },
        onError: () => {
            Alert.alert('Error', 'Failed to post update. Please try again.');
        }
    });

    const handlePost = () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Error', 'Please enter both title and message');
            return;
        }

        mutation.mutate({
            title,
            message,
            media_urls: mediaUrls,
            is_visible_to_customer: isVisibleToCustomer,
        });
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <Card style={styles.content}>
                        <View style={styles.header}>
                            <Text style={styles.modalTitle}>Add Progress Update</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color={colors.text.secondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Input
                                label="Update Title"
                                placeholder="e.g. Engine Disassembly"
                                value={title}
                                onChangeText={setTitle}
                            />

                            <Input
                                label="Message to Customer"
                                placeholder="Detailed status of the current progress..."
                                value={message}
                                onChangeText={setMessage}
                                multiline
                                numberOfLines={4}
                                style={{ height: 100, textAlignVertical: 'top' }}
                            />

                            <MediaUpload
                                jobId={jobId}
                                category="service"
                                onUploadComplete={(urls) => setMediaUrls(prev => [...prev, ...urls])}
                            />

                            <TouchableOpacity
                                style={styles.switchRow}
                                onPress={() => setIsVisibleToCustomer(!isVisibleToCustomer)}
                            >
                                <Ionicons
                                    name={isVisibleToCustomer ? 'checkbox' : 'square-outline'}
                                    size={24}
                                    color={isVisibleToCustomer ? colors.primary[400] : colors.text.tertiary}
                                />
                                <Text style={styles.switchLabel}>Visible to customer</Text>
                            </TouchableOpacity>

                            <Button
                                title="Post Update"
                                onPress={handlePost}
                                loading={mutation.isPending}
                                fullWidth
                                style={styles.postBtn}
                            />
                        </ScrollView>
                    </Card>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: colors.background.primary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '90%',
    },
    content: {
        borderRadius: 0,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        padding: spacing.lg,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    modalTitle: {
        fontSize: typography.size.lg,
        color: colors.text.primary,
        fontWeight: 'bold',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    switchLabel: {
        fontSize: typography.size.md,
        color: colors.text.primary,
    },
    postBtn: {
        marginTop: spacing.xl,
        marginBottom: spacing.md,
    },
});
