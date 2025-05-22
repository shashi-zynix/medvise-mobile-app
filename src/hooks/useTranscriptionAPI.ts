import { useState, useEffect, useRef } from 'react';
import { transcriptionService } from '../api';
import logger from '../utils/logger';
import { showApiErrorToast, showErrorToast } from '../utils/toastUtils';
import { 
  TranscriptionResult,
  TranscribeChunkResponse,
  SignedUrlResponse 
} from '../types/apiTypes';

interface TranscriptionOptions {
  recordId: number;
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  onError?: (error: any) => void;
  intervalMilliseconds?: number;
}

const useTranscriptionAPI = ({
  recordId,
  onTranscriptionComplete,
  onError,
  intervalMilliseconds = 120000, 
}: TranscriptionOptions) => {  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sequenceId, setSequenceId] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioDataRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);  const startTranscription = (initialAudioData?: number[]): void => {
    setSequenceId(1);
    audioDataRef.current = [];
    
    if (initialAudioData && Array.isArray(initialAudioData)) {
      const validData = initialAudioData.filter(val => typeof val === 'number' && !isNaN(val));
      
      if (validData.length !== initialAudioData.length) {
        logger.warn('Some initial audio data was filtered out as invalid', {
          hook: 'useTranscriptionAPI',
          method: 'startTranscription',
          total_items: initialAudioData.length,
          valid_items: validData.length,
          filtered_count: initialAudioData.length - validData.length
        });
      }
      
      audioDataRef.current = validData;
      
      const nonZeroValues = validData.filter(val => val !== 0).length;
      const nonZeroPercent = validData.length > 0 ? (nonZeroValues / validData.length) * 100 : 0;
      
      logger.info('Initial audio data analysis', {
        hook: 'useTranscriptionAPI',
        method: 'startTranscription',
        record_id: recordId,
        data_length: validData.length,
        non_zero_values: nonZeroValues,
        non_zero_percent: nonZeroPercent.toFixed(2) + '%',
        has_valid_content: nonZeroPercent > 10
      });
    }
    
    setIsTranscribing(true);
    
    logger.info('Starting transcription process', {
      hook: 'useTranscriptionAPI',
      method: 'startTranscription',
      record_id: recordId,
      initial_data_length: audioDataRef.current.length,
      interval_ms: intervalMilliseconds,
      sequence_start: sequenceId
    });
    
    sendAudioChunk();
    
    intervalRef.current = setInterval(() => {
      if (audioDataRef.current.length > 0) {
        logger.debug('Sending periodic audio chunk via interval', {
          hook: 'useTranscriptionAPI',
          record_id: recordId,
          sequence_id: sequenceId,
          data_length: audioDataRef.current.length,
          interval_ms: intervalMilliseconds
        });
        sendAudioChunk();
      } else {
        logger.debug('Skipping periodic send - no data available', {
          hook: 'useTranscriptionAPI',
          record_id: recordId,
          sequence_id: sequenceId
        });
      }
    }, intervalMilliseconds);
  };const stopTranscription = async (url?: string): Promise<TranscriptionResult | null> => {
    logger.info('Stopping transcription process', {
      hook: 'useTranscriptionAPI',
      method: 'stopTranscription',
      record_id: recordId,
      has_url_context: !!url,
      current_sequence_id: sequenceId,
      accumulated_data_points: audioDataRef.current.length
    });
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      logger.debug('Cleared transcription interval timer', {
        hook: 'useTranscriptionAPI',
        record_id: recordId
      });
    }
    
    setIsTranscribing(false);
    
    if (audioDataRef.current.length > 0) {
      const remainingAudio = audioDataRef.current;
      const hasContent = remainingAudio.some(val => val !== 0);
      
      logger.info('Remaining audio data analysis', {
        hook: 'useTranscriptionAPI',
        method: 'stopTranscription',
        record_id: recordId,
        data_length: remainingAudio.length,
        has_content: hasContent,
        min: remainingAudio.length > 0 ? Math.min(...remainingAudio) : null,
        max: remainingAudio.length > 0 ? Math.max(...remainingAudio) : null,
        avg: remainingAudio.length > 0 
          ? remainingAudio.reduce((sum, val) => sum + val, 0) / remainingAudio.length 
          : null,
        zero_percentage: (remainingAudio.filter(v => v === 0).length / remainingAudio.length) * 100
      });
    }
      try {
      logger.info('Skipping endTranscription API call (disabled)', {
        hook: 'useTranscriptionAPI',
        method: 'stopTranscription',
        record_id: recordId,
        has_url_context: !!url
      });
      
      const response = {
        text: 'Transcription completed successfully.',
        status: 'success',
        recordId: recordId
      };
      
      logger.info('Successfully ended transcription (mock response)', {
        hook: 'useTranscriptionAPI',
        method: 'stopTranscription',
        record_id: recordId,
        response_status: 'success',
        has_result_text: !!response?.text,
        text_length: response?.text?.length || 0
      });
      
      if (onTranscriptionComplete && response) {
        onTranscriptionComplete(response);
      }
      
      return response;
    } catch (error: any) {
      logger.error('Failed to end transcription', {
        hook: 'useTranscriptionAPI',
        method: 'stopTranscription',
        record_id: recordId,
        error: error?.message || 'Unknown error',
        has_url_context: !!url
      });
      
      showApiErrorToast('Transcription Error', error);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  };
  const sendAudioChunk = async (): Promise<TranscribeChunkResponse | null> => {
    if (!isTranscribing) {
      logger.debug('Not sending audio chunk - transcription not active', {
        hook: 'useTranscriptionAPI',
        method: 'sendAudioChunk',
        record_id: recordId,
      });
      return null;
    }
    
    try {
      const audioData = audioDataRef.current;
      
      const audioMetrics = {
        length: audioData.length,
        has_content: audioData.length > 0,
        min: audioData.length > 0 ? Math.min(...audioData) : null,
        max: audioData.length > 0 ? Math.max(...audioData) : null,
        avg: audioData.length > 0 
          ? audioData.reduce((sum, val) => sum + val, 0) / audioData.length 
          : null,
        zero_count: audioData.filter(v => v === 0).length,
        is_empty: audioData.length === 0 || audioData.every(v => v === 0)
      };
      
      logger.info('Sending audio chunk for transcription', {
        hook: 'useTranscriptionAPI',
        method: 'sendAudioChunk',
        record_id: recordId,
        sequence_id: sequenceId,
        audio_metrics: audioMetrics
      });
      
      const response = await transcriptionService.sendAudioChunkForTranscription(
        recordId,
        sequenceId,
        audioData
      );
      
      if (response !== null) {
        setSequenceId(prev => prev + 1);
        
        logger.debug('Audio chunk sent successfully, clearing buffer', {
          hook: 'useTranscriptionAPI',
          method: 'sendAudioChunk',
          record_id: recordId,
          sequence_id: sequenceId,
          response_status: response.status || 'unknown'
        });
        
        audioDataRef.current = [];
      }
      
      return response;
    } catch (error) {
      logger.error('Failed to send audio chunk', {
        hook: 'useTranscriptionAPI',
        method: 'sendAudioChunk',
        record_id: recordId,
        sequence_id: sequenceId,
        error: error instanceof Error ? error.message : 'Unknown error',
        audio_data_length: audioDataRef.current.length
      });
      
      showApiErrorToast('Audio Processing Error', error);
      
      if (onError) {
        onError(error);
      }
      
      return null;
    }
  };
  const updateAudioData = (newAudioData: number[]) => {
    if (Array.isArray(newAudioData) && newAudioData.length > 0) {
      const validData = newAudioData.filter(val => typeof val === 'number' && !isNaN(val));
      
      if (validData.length !== newAudioData.length) {
        logger.warn('Some audio data was filtered out as invalid', {
          hook: 'useTranscriptionAPI',
          method: 'updateAudioData',
          total_items: newAudioData.length,
          valid_items: validData.length,
          filtered_count: newAudioData.length - validData.length
        });
      }
      
      const nonZeroValues = validData.filter(val => val !== 0).length;
      const percentNonZero = validData.length > 0 ? (nonZeroValues / validData.length) * 100 : 0;
      
      if (percentNonZero < 10 && validData.length > 10) {
        logger.warn('Audio data contains mostly silence', {
          hook: 'useTranscriptionAPI',
          method: 'updateAudioData',
          non_zero_percent: percentNonZero.toFixed(2) + '%',
          data_length: validData.length
        });
      }
      
      audioDataRef.current = [...audioDataRef.current, ...validData];
      
      logger.debug('Updated audio data buffer', {
        hook: 'useTranscriptionAPI',
        method: 'updateAudioData',
        added_items: validData.length,
        current_buffer_size: audioDataRef.current.length
      });
    } else {
      logger.warn('Attempted to update with invalid audio data', {
        hook: 'useTranscriptionAPI',
        method: 'updateAudioData',
        is_array: Array.isArray(newAudioData),
        data_length: Array.isArray(newAudioData) ? newAudioData.length : 0
      });
    }
  };

  return {
    startTranscription,
    stopTranscription,
    sendAudioChunk,
    updateAudioData,
    isTranscribing,
    sequenceId,
  };
};

export default useTranscriptionAPI;