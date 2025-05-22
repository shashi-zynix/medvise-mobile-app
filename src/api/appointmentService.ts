import apiClient, { ApiResponse } from './apiClient';
import logger from '../utils/logger';
import axios from 'axios';
import {encode as btoa} from 'base-64';
import { showApiErrorToast } from '../utils/toastUtils';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

export interface AppointmentMetadata {
  age: string;
  sex_at_birth: string;
}

export interface Appointment {
  id: number;
  identifier: string;
  appointment_name: string;
  appointment_time: string;
  appointment_start_time: string;
  appointment_type: string;
  doctor: number;
  patient: number | null;
  reason_for_visit: string;
  metadata: AppointmentMetadata;
  appointment_status: string;
  emr_push_status: string;
}

export interface AppointmentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Appointment[];
}

export interface GetAppointmentsParams {
  appointment_date_start: string;
  appointment_date_end: string;
  status?: string;
  limit?: number;
  offset?: number;
  order_by_desc?: boolean;
}

export interface CreateRecordRequest {
  appointment_id: number;
  start_time: string;
  content_type: string;
  file_type: string;
}

export interface CreateRecordResponse {
  record_id: number;
  appointment_id: number;
}

export interface SignedUrlRequest {
  record_id: number;
}

export interface SignedUrlResponse {
  url: string;
  fields: {
    'Content-Type': string;
    key: string;
    AWSAccessKeyId: string;
    'x-amz-security-token': string;
    policy: string;
    signature: string;
  };
  record_id: number;
  expiration: string;
}

export interface S3UploadRequest {
  signedUrlResponse: SignedUrlResponse;
  appointmentId: number;
  audioPath: string;
}

export interface S3UploadResponse {
  success: boolean;
  message?: string;
  recordId: number;
}

export interface RecordCompleteRequest {
  record_id: number;
}

export interface RecordCompleteResponse {
  record_id: number;
  status: string;
}

export interface TranscriptionStatusResponse {
  transcription_status: string;
  record_id?: number;
}

export interface SoapNoteGenerationResponse {
  soap_note_generation_status: string;
  updated_at: string;
  record_id?: number;
}

export interface SoapNoteDataResponse {
  id: number;
  appointment_id: number;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

class AppointmentService {

  async getAppointments(params: GetAppointmentsParams): Promise<ApiResponse<AppointmentListResponse>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    const url = `/api/V2/account/appointments/?${queryParams.toString()}`;
    
    return apiClient.get<AppointmentListResponse>(url);
  }

  async createRecord(data: CreateRecordRequest): Promise<ApiResponse<CreateRecordResponse>> {
    const url = '/api/V2/account/records/create/';
    return apiClient.post<CreateRecordResponse>(url, data);
  }

  async getSignedUrl(data: SignedUrlRequest): Promise<ApiResponse<SignedUrlResponse>> {
    const url = '/api/V2/account/records/signed_url/';
    
    if (logger) {
      logger.info('Getting signed URL with payload:', {
        endpoint: '/api/V2/account/records/signed_url/',
        record_id: data.record_id,
      });
    }
    
    const response = await apiClient.post<SignedUrlResponse>(url, data);
    
    if (logger && response.success) {
      logger.debug('Successfully received signed URL', {
        record_id: data.record_id,
        url_expiration: response.data?.expiration,
        has_fields: !!response.data?.fields,
      });
    }
    
    return response;
  }

  async getAppointmentDetail(appointmentId: number): Promise<ApiResponse<Appointment>> {
    const url = `/api/V2/account/appointment/${appointmentId}/detail/`;
    return apiClient.get<Appointment>(url);
  }

  async uploadToS3(data: S3UploadRequest): Promise<ApiResponse<S3UploadResponse>> {
    try {
      const { signedUrlResponse, audioPath } = data;
      
      logger.info('Starting S3 upload from appointmentService', {
        url_available: !!signedUrlResponse.url,
        fields_available: !!signedUrlResponse.fields,
        record_id: signedUrlResponse.record_id,
        audio_path: audioPath
      });

      if (!signedUrlResponse.url || !signedUrlResponse.fields) {
        logger.error('Missing required S3 upload parameters', {
          url: !!signedUrlResponse.url,
          fields: !!signedUrlResponse.fields
        });
        return {
          success: false,
          error: {
            message: 'Missing required S3 upload parameters',
            code: 'INVALID_PARAMETERS',
          }
        };
      }

      const formData = new FormData();
      formData.append('key', signedUrlResponse.fields.key);
      formData.append('AWSAccessKeyId', signedUrlResponse.fields.AWSAccessKeyId);
      formData.append('x-amz-security-token', signedUrlResponse.fields['x-amz-security-token']);
      formData.append('policy', signedUrlResponse.fields.policy);
      formData.append('signature', signedUrlResponse.fields.signature);
      formData.append('Content-Type', signedUrlResponse.fields['Content-Type']);
      
      if (!audioPath) {
        throw new Error('Missing audioPath for S3 upload');
      }
      const fileUri = Platform.OS === 'ios' ? audioPath : audioPath.replace('file://', '');
      const exists = await RNFS.exists(fileUri);
      if (!exists) {
        throw new Error(`Audio file not found at path: ${fileUri}`);
      }
      logger.info('Uploading audio file for S3 upload', { audioPath: fileUri });
      formData.append('file', {
        uri: fileUri,
        name: signedUrlResponse.fields.key,
        type: signedUrlResponse.fields['Content-Type'],
      } as any);
      
      logger.info('Submitting form data to S3', {
        url: signedUrlResponse.url,
      });

      const response = await axios.post(signedUrlResponse.url, formData, {
        headers: { 'Accept': 'application/xml' },
      });

      logger.info('S3 upload successful from service', {
        status: response.status,
        record_id: signedUrlResponse.record_id
      });
      
      return {
        success: true,
        data: {
          success: true,
          recordId: signedUrlResponse.record_id,
          message: 'Audio file uploaded successfully'
        }
      };
    } catch (error: any) {
      if (error.response) {
        logger.error('S3 upload failed in appointmentService', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      } else {
        logger.error('Error during S3 upload in appointmentService', {
          error: error.message || 'Unknown error',
          stack: error.stack
        });
      }
      
      showApiErrorToast('Upload Error', error);
      
      return {
        success: false,
        error: {
          message: error.message || 'Unknown error occurred while uploading to S3',
          code: 'S3_UPLOAD_ERROR',
          details: error.response?.data || error.message
        }
      };
    }
  }

  async checkRecordComplete(data: RecordCompleteRequest): Promise<ApiResponse<RecordCompleteResponse>> {
    const url = '/api/V2/account/records/complete/';
    
    if (logger) {
      logger.info('Checking record completion status:', {
        endpoint: url,
        record_id: data.record_id,
      });
    }
    
    try {
      const response = await apiClient.post<RecordCompleteResponse>(url, data);
      
      if (logger) {
        logger.info('Record completion check response:', {
          record_id: data.record_id,
          status: response.data?.status || 'unknown',
          success: response.success
        });
      }
      
      return response;
    } catch (error: any) {
      logger.error('Error checking record completion status:', {
        record_id: data.record_id,
        error: error.message || 'Unknown error',
        stack: error.stack
      });
      
      showApiErrorToast('Record Status Error', error);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to check record completion status',
          code: 'RECORD_COMPLETE_ERROR',
          details: error.response?.data || error.message
        }
      };
    }
  }

  async getTranscriptionStatus(recordId: number): Promise<ApiResponse<TranscriptionStatusResponse>> {
    const url = `/api/V2/account/record/${recordId}/transcription/status/`;
    
    if (logger) {
      logger.info('Checking transcription status:', {
        endpoint: url,
        record_id: recordId,
      });
    }
    
    try {
      const response = await apiClient.get<TranscriptionStatusResponse>(url);
      
      if (logger) {
        logger.info('Transcription status check response:', {
          record_id: recordId,
          status: response.data?.transcription_status || 'unknown',
          success: response.success
        });
      }
      
      return response;
    } catch (error: any) {
      logger.error('Error checking transcription status:', {
        record_id: recordId,
        error: error.message || 'Unknown error',
        stack: error.stack
      });
      
      showApiErrorToast('Transcription Status Error', error);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to check transcription status',
          code: 'TRANSCRIPTION_STATUS_ERROR',
          details: error.response?.data || error.message
        }
      };
    }
  }

  async generateSoapNotes(appointmentId: number): Promise<ApiResponse<SoapNoteGenerationResponse>> {
    const url = `/api/V2/account/appointment/${appointmentId}/soap_note_data/generate/`;
    
    if (logger) {
      logger.info('Initiating SOAP note generation:', {
        endpoint: url,
        appointment_id: appointmentId,
      });
    }
    
    try {
      const response = await apiClient.post<SoapNoteGenerationResponse>(url, {});
      
      if (logger) {
        logger.info('SOAP note generation initiated:', {
          appointment_id: appointmentId,
          status: response.data?.soap_note_generation_status || 'unknown',
          success: response.success
        });
      }
      
      return response;
    } catch (error: any) {
      logger.error('Error initiating SOAP note generation:', {
        appointment_id: appointmentId,
        error: error.message || 'Unknown error',
        stack: error.stack
      });
      
      showApiErrorToast('SOAP Notes Error', error);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to initiate SOAP note generation',
          code: 'SOAP_NOTE_GENERATION_ERROR',
          details: error.response?.data || error.message
        }
      };
    }
  }

  async getSoapNoteStatus(appointmentId: number): Promise<ApiResponse<SoapNoteGenerationResponse>> {
    const url = `/api/V2/account/appointment/${appointmentId}/soap_note_data/status/`;
    
    if (logger) {
      logger.info('Checking SOAP note generation status:', {
        endpoint: url,
        appointment_id: appointmentId,
      });
    }
    
    try {
      const response = await apiClient.get<SoapNoteGenerationResponse>(url);
      
      if (logger) {
        logger.info('SOAP note status check response:', {
          appointment_id: appointmentId,
          status: response.data?.soap_note_generation_status || 'unknown',
          updated_at: response.data?.updated_at,
          success: response.success
        });
      }
      
      return response;
    } catch (error: any) {
      logger.error('Error checking SOAP note generation status:', {
        appointment_id: appointmentId,
        error: error.message || 'Unknown error',
        stack: error.stack
      });
      
      showApiErrorToast('SOAP Notes Status Error', error);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to check SOAP note generation status',
          code: 'SOAP_NOTE_STATUS_ERROR',
          details: error.response?.data || error.message
        }
      };
    }
  }

  async getSoapNoteData(appointmentId: number): Promise<ApiResponse<SoapNoteDataResponse>> {
    const url = `/api/V2/account/appointment/${appointmentId}/soap_note_data/`;
    
    if (logger) {
      logger.info('Fetching SOAP note data:', {
        endpoint: url,
        appointment_id: appointmentId,
      });
    }
    
    try {
      const response = await apiClient.get<SoapNoteDataResponse>(url);
      
      if (logger) {
        logger.info('SOAP note data fetch response:', {
          appointment_id: appointmentId,
          success: response.success,
          data_available: !!response.data
        });
      }
      
      return response;
    } catch (error: any) {
      logger.error('Error fetching SOAP note data:', {
        appointment_id: appointmentId,
        error: error.message || 'Unknown error',
        stack: error.stack
      });
      
      showApiErrorToast('SOAP Notes Data Error', error);
      
      return {
        success: false,
        error: {
          message: error.message || 'Failed to fetch SOAP note data',
          code: 'SOAP_NOTE_DATA_ERROR',
          details: error.response?.data || error.message
        }
      };
    }
  }
}

export const appointmentService = new AppointmentService();

export default appointmentService;