/**
 * Media Upload Component - Photos/Videos during service
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadAPI } from '@/services';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';

interface MediaItem {
    id: string;
    uri: string;
    type: 'image' | 'video';
    uploading?: boolean;
    uploaded?: boolean;
    url?: string;
}

interface MediaUploadProps {
    jobId: string;
    category: 'intake' | 'diagnosis' | 'service' | 'qc' | 'delivery';
    maxItems?: number;
    onUploadComplete?: (urls: string[]) => void;
}

export default function MediaUpload({ jobId, category, maxItems = 10, onUploadComplete }: MediaUploadProps) {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [uploading, setUploading] = useState(false);

    const pickImage = async (useCamera: boolean) => {
        try {
            const permission = useCamera
                ? await ImagePicker.requestCameraPermissionsAsync()
                : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!permission.granted) {
                Alert.alert('Permission needed', 'Please grant access to continue');
                return;
            }

            const result = useCamera
                ? await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    quality: 0.8,
                    videoMaxDuration: 30,
                })
                : await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    quality: 0.8,
                    allowsMultipleSelection: true,
                    selectionLimit: maxItems - media.length,
                });

            if (!result.canceled && result.assets) {
                const newMedia: MediaItem[] = result.assets.map(asset => ({
                    id: Math.random().toString(36).substr(2, 9),
                    uri: asset.uri,
                    type: asset.type === 'video' ? 'video' : 'image',
                    uploading: false,
                    uploaded: false,
                }));

                setMedia(prev => [...prev, ...newMedia].slice(0, maxItems));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick media');
        }
    };

    const removeItem = (id: string) => {
        setMedia(prev => prev.filter(m => m.id !== id));
    };

    const uploadAll = async () => {
        const toUpload = media.filter(m => !m.uploaded);
        if (toUpload.length === 0) return;

        setUploading(true);
        const uploadedUrls: string[] = [];

        for (const item of toUpload) {
            setMedia(prev => prev.map(m => m.id === item.id ? { ...m, uploading: true } : m));

            try {
                const formData = new FormData();
                formData.append('file', {
                    uri: item.uri,
                    type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
                    name: `${category}_${item.id}.${item.type === 'video' ? 'mp4' : 'jpg'}`,
                } as any);
                formData.append('category', category);
                formData.append('job_id', jobId);

                const response = await uploadAPI.uploadFile(formData);

                if (response.data?.url) {
                    uploadedUrls.push(response.data.url);
                    setMedia(prev => prev.map(m =>
                        m.id === item.id ? { ...m, uploading: false, uploaded: true, url: response.data.url } : m
                    ));
                }
            } catch (error) {
                setMedia(prev => prev.map(m => m.id === item.id ? { ...m, uploading: false } : m));
                console.error('Upload failed:', error);
            }
        }

        setUploading(false);
        if (onUploadComplete && uploadedUrls.length > 0) {
            onUploadComplete(uploadedUrls);
        }
    };

    const uploadedCount = media.filter(m => m.uploaded).length;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Photos & Videos</Text>
                <Text style={styles.count}>{media.length}/{maxItems}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                <View style={styles.mediaGrid}>
                    {media.map(item => (
                        <View key={item.id} style={styles.mediaItem}>
                            <Image source={{ uri: item.uri }} style={styles.thumbnail} />
                            {item.type === 'video' && (
                                <View style={styles.videoOverlay}>
                                    <Ionicons name="play-circle" size={32} color="#fff" />
                                </View>
                            )}
                            {item.uploading && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator color="#fff" />
                                </View>
                            )}
                            {item.uploaded && (
                                <View style={styles.uploadedBadge}>
                                    <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
                                </View>
                            )}
                            {!item.uploaded && !item.uploading && (
                                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                                    <Ionicons name="close" size={16} color="#fff" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}

                    {media.length < maxItems && (
                        <>
                            <TouchableOpacity style={styles.addButton} onPress={() => pickImage(true)}>
                                <Ionicons name="camera" size={28} color={colors.primary[400]} />
                                <Text style={styles.addText}>Camera</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.addButton} onPress={() => pickImage(false)}>
                                <Ionicons name="images" size={28} color={colors.primary[400]} />
                                <Text style={styles.addText}>Gallery</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </ScrollView>

            {media.length > 0 && uploadedCount < media.length && (
                <TouchableOpacity style={styles.uploadBtn} onPress={uploadAll} disabled={uploading}>
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload" size={20} color="#fff" />
                            <Text style={styles.uploadBtnText}>Upload {media.length - uploadedCount} files</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: spacing.md },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    title: { fontSize: 16, color: colors.text.primary, fontWeight: '600' },
    count: { fontSize: 14, color: colors.text.tertiary },
    mediaScroll: { marginHorizontal: -spacing.lg },
    mediaGrid: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm },
    mediaItem: { width: 100, height: 100, borderRadius: borderRadius.md, overflow: 'hidden' },
    thumbnail: { width: '100%', height: '100%' },
    videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    uploadedBadge: { position: 'absolute', bottom: 4, right: 4 },
    removeBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    addButton: { width: 100, height: 100, borderRadius: borderRadius.md, backgroundColor: colors.background.tertiary, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.neutral[600], justifyContent: 'center', alignItems: 'center', gap: 4 },
    addText: { fontSize: 12, color: colors.text.tertiary },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary[500], padding: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.md },
    uploadBtnText: { color: '#fff', fontWeight: '600' },
});
