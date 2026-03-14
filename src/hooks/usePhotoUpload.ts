/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/usePhotoUpload.ts
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import { api } from '../services/api';

interface UploadedPhoto {
  id: string;
  url: string;
  position: number;
  isPrimary: boolean;
}

export function usePhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickAndUpload = useCallback(async (): Promise<UploadedPhoto | null> => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];
    setUploading(true);
    setProgress(0);

    try {
      // Get presigned URL from backend
      const { data } = await api.post('/upload/presign', {
        fileType: 'image/jpeg',
        folder: 'photos',
      });

      const { url: presignedUrl, key, publicUrl } = data;

      // Upload directly to S3
      await FileSystem.uploadAsync(presignedUrl, asset.uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      });

      setProgress(80);

      // Confirm with backend
      const { data: photo } = await api.post('/upload/confirm', {
        key,
        url: publicUrl,
      });

      setProgress(100);
      return photo.photo;
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message);
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, []);

  const takePhoto = useCallback(async (): Promise<UploadedPhoto | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow camera access.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return null;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const { data } = await api.post('/upload/presign', { fileType: 'image/jpeg' });

      await FileSystem.uploadAsync(data.url, asset.uri, {
        httpMethod: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      const { data: photo } = await api.post('/upload/confirm', {
        key: data.key,
        url: data.publicUrl,
      });

      return photo.photo;
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message);
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
    try {
      await api.delete(`/upload/photo/${photoId}`);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { pickAndUpload, takePhoto, deletePhoto, uploading, progress };
}
