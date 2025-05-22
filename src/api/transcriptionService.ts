import apiClient from './apiClient';
import logger from '../utils/logger';
import { showApiErrorToast } from '../utils/toastUtils';
import { 
  TranscriptionResult, 
  TranscribeChunkResponse, 
  TranscribeChunkRequest 
} from '../types/apiTypes';

export const sendAudioChunkForTranscription = async (
  recordId: number, 
  sequenceId: number, 
  audioData: number[]
): Promise<TranscribeChunkResponse | null> => {
  try {
    if (!audioData || audioData.length === 0) {
      logger.debug('No audio data available for transcription', { 
        sequence_id: sequenceId, 
        record_id: recordId 
      });
      return null;
    }
    
    const sanitizedAudioData = validateAudioData(audioData);
    
    if (sanitizedAudioData.length === 0) {
      logger.warn('All audio data was filtered out during validation', { 
        sequence_id: sequenceId,
        record_id: recordId,
        original_length: audioData.length
      });
      return null;
    }
    
    const formData = new FormData();
    
    const binaryString = sanitizedAudioData.map(byte => String.fromCharCode(byte)).join('');
    const base64Audio = btoa(binaryString);
    
    formData.append('audio', {
      uri: `data:application/octet-stream;base64,${base64Audio}`,
      name: 'audio.bin',
      type: 'application/octet-stream',
    } as any);
    
    formData.append('record_id', recordId);
    formData.append('sequence_id', sequenceId);
    
    logger.info('Sending audio chunk with FormData:', {
      endpoint: '/api/V2/account/records/transcribe_audio_chunk/',
      record_id: recordId,
      sequence_id: sequenceId,
      original_audio_length: audioData.length,
      sanitized_audio_length: sanitizedAudioData.length,
      filtered_items: audioData.length - sanitizedAudioData.length,
      has_non_zero_values: sanitizedAudioData.some(val => val > 0.05),
      timestamp: new Date().toISOString()
    });
    
    const response = await apiClient.post('/api/V2/account/records/transcribe_audio_chunk/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    logger.debug('Successfully sent audio chunk for transcription', { 
      sequenceId, 
      recordId 
    });
    
    return response.data;  } catch (error: any) {
    logger.error('Error sending audio chunk for transcription', {
      endpoint: '/api/V2/account/records/transcribe_audio_chunk/',
      sequence_id: sequenceId,
      record_id: recordId,
      audio_data_length: audioData?.length || 0,
      error_message: error?.message || 'Unknown error',
      error_code: error?.code,
      error_response: error?.response?.data,
      status_code: error?.response?.status
    });
    
    showApiErrorToast('Transcription Error', error);
    
    throw error;
  }
};

export const endTranscription = async (
  recordId: number, 
  url?: string
): Promise<TranscriptionResult> => {
  try {    const formData = new FormData();
    formData.append('record_id', recordId.toString());
    
    if (url) {
      formData.append('url', url);
    }
    
    logger.info('Ending transcription with payload:', {
      endpoint: '/api/V2/account/records/end_transcription',
      record_id: recordId,
      has_url_context: !!url,
      url: url ? url.substring(0, 50) + '...' : undefined
    });
    
    const response = await apiClient.post('/api/V2/account/records/end_transcription', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    
    logger.debug('Successfully ended transcription', { recordId, url });
    return response.data;  } catch (error: any) {
    logger.error('Error ending transcription', {
      endpoint: '/api/V2/account/records/end_transcription',
      record_id: recordId,
      has_url_context: !!url,
      error_message: error?.message || 'Unknown error',
      error_code: error?.code,
      error_response: error?.response?.data,
      status_code: error?.response?.status
    });
    
    showApiErrorToast('Transcription Error', error, 4000);
    
    throw error;
  }
};

export const validateAudioData = (audioData: any[]): number[] => {
  if (!audioData || !Array.isArray(audioData)) {
    logger.warn('Invalid audio data provided - not an array');
    return [];
  }
  
  const sanitizedData = audioData
    .filter(item => typeof item === 'number' && !isNaN(item))
    .map(value => {
      if (value < 0) return 0;
      if (value > 1) return 1;
      return value;
    });
  
  if (sanitizedData.length !== audioData.length) {
    logger.warn('Some audio data was filtered out during validation', {
      original_length: audioData.length,
      sanitized_length: sanitizedData.length,
      filtered_count: audioData.length - sanitizedData.length
    });
  }
  
  const nonZeroCount = sanitizedData.filter(val => val > 0.05).length;
  const nonZeroPercent = sanitizedData.length > 0 
    ? (nonZeroCount / sanitizedData.length) * 100 
    : 0;
  
  if (nonZeroPercent < 5 && sanitizedData.length > 10) {
    logger.warn('Audio data appears to be mostly silence', {
      non_zero_percent: nonZeroPercent.toFixed(2) + '%',
      data_length: sanitizedData.length
    });
  }
  
  return sanitizedData;
};

const transcriptionService = {
  sendAudioChunkForTranscription,
  endTranscription,
  validateAudioData
};

export default transcriptionService;