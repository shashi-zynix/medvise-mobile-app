import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {
  appointmentService,
  AppointmentListResponse,
  Appointment,
  GetAppointmentsParams,
  CreateRecordRequest,
  CreateRecordResponse,
  SignedUrlRequest,
  SignedUrlResponse,
  S3UploadRequest,
  S3UploadResponse,
  RecordCompleteRequest,
  RecordCompleteResponse,
  TranscriptionStatusResponse,
  SoapNoteGenerationResponse,
  SoapNoteDataResponse,
} from '../../api/appointmentService';
import apiClient from '../../api/apiClient';
import logger from '../../utils/logger';
import {encode as btoa} from 'base-64';
import {Platform} from 'react-native';

interface TranscribeAudioChunkResponse {
  status: string;
}

interface AppointmentsState {
  appointments: Appointment[];
  total: number;
  loading: boolean;
  error: string | null;
  currentParams: GetAppointmentsParams;
  record: CreateRecordResponse | null;
  selectedAppointmentDetail: Appointment | null;
  signedUrlResponse: SignedUrlResponse | null;
  transcribeAudioChunk: TranscribeAudioChunkResponse | null;
  s3UploadResult: S3UploadResponse | null;
  recordCompleteStatus: RecordCompleteResponse | null;
  recordCompletePollActive: boolean;
  transcriptionStatus: TranscriptionStatusResponse | null;
  transcriptionPollActive: boolean;
  soapNoteGenerationStatus: SoapNoteGenerationResponse | null;
  soapNotePollActive: boolean;
  soapNoteData: SoapNoteDataResponse | null;
  selectedTimePeriod: number; // 0: Today, 1: Last 7 days, 2: Last 14 days
}

const formatYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDate = (): string => {
  return formatYYYYMMDD(new Date());
};

const getDateFromDaysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatYYYYMMDD(date);
};

const initialState: AppointmentsState = {
  appointments: [],
  total: 0,
  loading: false,
  error: null,
  currentParams: {
    appointment_date_start: getTodayDate(),
    appointment_date_end: getTodayDate(),
    status: 'in_progress',
    limit: 30,
    offset: 0,
    order_by_desc: true,
  },
  record: null,
  selectedAppointmentDetail: null,
  signedUrlResponse: null,
  transcribeAudioChunk: null,
  s3UploadResult: null,
  recordCompleteStatus: null,
  recordCompletePollActive: false,
  transcriptionStatus: null,
  transcriptionPollActive: false,
  soapNoteGenerationStatus: null,
  soapNotePollActive: false,
  soapNoteData: null,
  selectedTimePeriod: 0, // Default to Today (0)
};

export const fetchAppointments = createAsyncThunk<
  AppointmentListResponse,
  GetAppointmentsParams | undefined,
  {rejectValue: string; state: {appointments: AppointmentsState}}
>(
  'appointments/fetchAppointments',
  async (params, {getState, rejectWithValue}) => {
    try {
      let requestParams: GetAppointmentsParams;

      if (params) {
        requestParams = params;
      } else {
        const state = getState();
        if (!state.appointments || !state.appointments.currentParams) {
          requestParams = {
            appointment_date_start: getTodayDate(),
            appointment_date_end: getTodayDate(),
            limit: 30,
            offset: 0,
            order_by_desc: true,
          };
        } else {
          requestParams = state.appointments.currentParams;
        }
      }

      const response = await appointmentService.getAppointments(requestParams);

      if (!response.success || !response.data) {
        return rejectWithValue(
          response.error?.message || 'Failed to fetch appointments',
        );
      }

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message ||
          'An unknown error occurred while fetching appointments',
      );
    }
  },
);

export const createRecord = createAsyncThunk<
  CreateRecordResponse,
  CreateRecordRequest,
  {rejectValue: string}
>('appointments/createRecord', async (data, {rejectWithValue}) => {
  try {
    const response = await appointmentService.createRecord(data);

    if (!response.success || !response.data) {
      return rejectWithValue(
        response.error?.message || 'Failed to create record',
      );
    }

    return response.data;
  } catch (error: any) {
    return rejectWithValue(
      error.message || 'An unknown error occurred while creating record',
    );
  }
});

export const fetchAppointmentDetail = createAsyncThunk<
  Appointment,
  number,
  {rejectValue: string}
>(
  'appointments/fetchAppointmentDetail',
  async (appointmentId, {rejectWithValue}) => {
    try {
      const response = await appointmentService.getAppointmentDetail(
        appointmentId,
      );

      if (!response.success || !response.data) {
        return rejectWithValue(
          response.error?.message || 'Failed to fetch appointment details',
        );
      }

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message ||
          'An unknown error occurred while fetching appointment details',
      );
    }
  },
);

export const getAudioRecordingSignedUrl = createAsyncThunk<
  SignedUrlResponse,
  SignedUrlRequest,
  {rejectValue: string}
>(
  'appointments/getAudioRecordingSignedUrl',
  async (data, {rejectWithValue}) => {
    try {
      logger.info('Dispatching getAudioRecordingSignedUrl action:', {
        action: 'getAudioRecordingSignedUrl',
        record_id: data.record_id,
      });

      const response = await appointmentService.getSignedUrl(data);

      if (!response.success || !response.data) {
        logger.error('Failed to get signed URL', {
          action: 'getAudioRecordingSignedUrl',
          record_id: data.record_id,
          error: response.error,
        });
        return rejectWithValue(
          response.error?.message || 'Failed to get signed URL',
        );
      }

      logger.info('Successfully completed getAudioRecordingSignedUrl action', {
        action: 'getAudioRecordingSignedUrl',
        record_id: data.record_id,
        has_url: !!response.data.url,
        expiration: response.data.expiration,
      });

      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.message || 'An unknown error occurred while getting signed URL',
      );
    }
  },
);

interface TranscribeAudioChunkRequest {
  recordId: number;
  sequenceId: number;
  audioData?: any[]; 
  audioPath?: string; 
}

export const transcribeAudioChunkAction = createAsyncThunk<
  TranscribeAudioChunkResponse,
  TranscribeAudioChunkRequest,
  {rejectValue: string}
>('appointments/transcribeAudioChunk', async (data, {rejectWithValue}) => {
  try {
    logger.info('Sending audio file for transcription:', {
      record_id: data.recordId,
      sequence_id: data.sequenceId,
      audio_path: data.audioPath,
    });

    const formData = new FormData();

    if (data.audioPath) {
      const file = {
        uri:
          Platform.OS === 'ios'
            ? data.audioPath
            : data.audioPath.replace('file://', ''),
        type: 'audio/m4a',
        name: `recording-${data.recordId}.m4a`,
      };
      formData.append('audio', file);
      logger.info('Appending audio file to FormData', {
        audioPath: data.audioPath,
      });
    }

    formData.append('sequence_id', +data.sequenceId);
    formData.append('record_id', +data.recordId);
    logger.info('FORM-DATA prepared for transcribe_audio_chunk API', {
      record_id: data.recordId,
      sequence_id: data.sequenceId,
      has_audio_path: !!data.audioPath,
    });

    logger.info('Dispatching transcribeAudioChunk with form-data payload', {
      action: 'transcribeAudioChunkAction',
      record_id: data.recordId,
      sequence_id: data.sequenceId,
      using_audio_file: !!data.audioPath,
    });

    const response = await apiClient.post(
      '/api/V2/account/records/transcribe_audio_chunk/',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    if (!response.data) {
      logger.error('Failed to transcribe audio chunk - empty response', {
        action: 'transcribeAudioChunkAction',
        record_id: data.recordId,
        sequence_id: data.sequenceId,
      });
      return rejectWithValue('Failed to transcribe audio chunk');
    }

    logger.info('Successfully completed transcribeAudioChunk action', {
      action: 'transcribeAudioChunkAction',
      record_id: data.recordId,
      sequence_id: data.sequenceId,
      status: response.data.status || 'unknown',
    });

    return response.data;
  } catch (error: any) {
    logger.error('Exception in transcribeAudioChunkAction', {
      action: 'transcribeAudioChunkAction',
      record_id: data.recordId,
      sequence_id: data.sequenceId,
      error: error.message || 'Unknown error',
    });
    return rejectWithValue(
      error.message ||
        'An unknown error occurred while transcribing audio chunk',
    );
  }
});

export const uploadToS3Action = createAsyncThunk<
  S3UploadResponse,
  S3UploadRequest,
  {rejectValue: string; dispatch: any}
>('appointments/uploadToS3', async (data, {rejectWithValue, dispatch}) => {
  try {
    logger.info('Dispatching uploadToS3 action via appointmentService:', {
      action: 'uploadToS3Action',
      record_id: data.signedUrlResponse.record_id,
      audio_path: data.audioPath,
      appointmentId: data.appointmentId
    });

    const response = await appointmentService.uploadToS3(data);

    if (!response.success || !response.data) {
      logger.error('Failed to upload to S3 via appointmentService', {
        action: 'uploadToS3Action',
        record_id: data.signedUrlResponse.record_id,
        error: response.error,
      });
      return rejectWithValue(
        response.error?.message || 'Failed to upload audio to S3',
      );
    }

    logger.info('Successfully completed uploadToS3 action', {
      action: 'uploadToS3Action',
      record_id: data.signedUrlResponse.record_id,
      success: response.data.success,
    });

    if (response.data.success) {
      logger.info('Starting record completion polling after S3 upload', {
        action: 'uploadToS3Action',
        record_id: data.signedUrlResponse.record_id,
      });

      dispatch(setRecordCompletePollActive(true));

      dispatch(
        checkRecordCompleteAction({
          record_id: data.signedUrlResponse.record_id,
        }),
      );

      dispatch(startRecordCompletionPolling(data.signedUrlResponse.record_id));
    }

    return response.data;
  } catch (error: any) {
    logger.error('Exception in uploadToS3Action', {
      action: 'uploadToS3Action',
      record_id: data.signedUrlResponse.record_id,
      error: error.message || 'Unknown error',
    });
    return rejectWithValue(
      error.message || 'An unknown error occurred while uploading to S3',
    );
  }
});


export const checkRecordCompleteAction = createAsyncThunk<
  RecordCompleteResponse,
  RecordCompleteRequest,
  {rejectValue: string}
>('appointments/checkRecordComplete', async (data, {rejectWithValue}) => {
  try {
    logger.info('Checking record completion status:', {
      action: 'checkRecordCompleteAction',
      record_id: data.record_id,
    });

    const response = await appointmentService.checkRecordComplete(data);

    if (!response.success || !response.data) {
      logger.error('Failed to check record completion status', {
        action: 'checkRecordCompleteAction',
        record_id: data.record_id,
        error: response.error,
      });
      return rejectWithValue(
        response.error?.message || 'Failed to check record completion status',
      );
    }

    logger.info('Record completion check result:', {
      action: 'checkRecordCompleteAction',
      record_id: data.record_id,
      status: response.data.status,
    });

    return response.data;
  } catch (error: any) {
    logger.error('Exception in checkRecordCompleteAction', {
      action: 'checkRecordCompleteAction',
      record_id: data.record_id,
      error: error.message || 'Unknown error',
    });
    return rejectWithValue(
      error.message || 'An unknown error occurred while checking record status',
    );
  }
});

export const getTranscriptionStatusAction = createAsyncThunk<
  TranscriptionStatusResponse,
  number, 
  {rejectValue: string}
>(
  'appointments/getTranscriptionStatus',
  async (recordId, {rejectWithValue}) => {
    try {
      logger.info('Checking transcription status:', {
        action: 'getTranscriptionStatusAction',
        record_id: recordId,
      });

      const response = await appointmentService.getTranscriptionStatus(
        recordId,
      );

      if (!response.success || !response.data) {
        logger.error('Failed to get transcription status', {
          action: 'getTranscriptionStatusAction',
          record_id: recordId,
          error: response.error,
        });
        return rejectWithValue(
          response.error?.message || 'Failed to get transcription status',
        );
      }

      const responseWithRecordId = {
        ...response.data,
        record_id: recordId,
      };

      logger.info('Transcription status check result:', {
        action: 'getTranscriptionStatusAction',
        record_id: recordId,
        status: responseWithRecordId.transcription_status,
      });

      return responseWithRecordId;
    } catch (error: any) {
      logger.error('Exception in getTranscriptionStatusAction', {
        action: 'getTranscriptionStatusAction',
        record_id: recordId,
        error: error.message || 'Unknown error',
      });
      return rejectWithValue(
        error.message ||
          'An unknown error occurred while getting transcription status',
      );
    }
  },
);

export const startTranscriptionPolling = createAsyncThunk<
  void,
  number, 
  {dispatch: any; state: {appointments: AppointmentsState}}
>(
  'appointments/startTranscriptionPolling',
  async (recordId, {dispatch, getState}) => {
    logger.info('Starting transcription status polling', {
      action: 'startTranscriptionPolling',
      record_id: recordId,
    });

    const intervalId = setInterval(async () => {
      const state = getState();

      if (
        !state.appointments.transcriptionPollActive ||
        state.appointments.transcriptionStatus?.transcription_status ===
          'completed'
      ) {
        logger.info('Stopping transcription status polling', {
          action: 'startTranscriptionPolling',
          record_id: recordId,
          is_active: state.appointments.transcriptionPollActive,
          status: state.appointments.transcriptionStatus?.transcription_status,
        });
        clearInterval(intervalId);

        if (
          state.appointments.transcriptionStatus?.transcription_status ===
          'completed'
        ) {
          logger.info(
            'Transcription is completed, initiating SOAP note generation',
            {
              action: 'startTranscriptionPolling',
              record_id: recordId,
            },
          );

          const appointmentId = state.appointments.record?.appointment_id;
          
          if (appointmentId) {
            dispatch(generateSoapNotesAction(appointmentId));
          } else {
            logger.error('Cannot generate SOAP notes: appointment ID not found', {
              action: 'startTranscriptionPolling',
              record_id: recordId,
            });
          }
        }

        return;
      }

      try {
        const result = await dispatch(
          getTranscriptionStatusAction(recordId),
        ).unwrap();

        if (result.transcription_status === 'completed') {
          logger.info('Transcription completed, stopping polling', {
            action: 'startTranscriptionPolling',
            record_id: recordId,
            status: result.transcription_status,
          });
          clearInterval(intervalId);

          dispatch(setTranscriptionPollActive(false));

          logger.info(
            'Initiating SOAP note generation after transcription completion',
            {
              action: 'startTranscriptionPolling',
              record_id: recordId,
            },
          );

          const appointmentId = state.appointments.record?.appointment_id;
          
          if (appointmentId) {
            dispatch(generateSoapNotesAction(appointmentId));
          } else {
            logger.error('Cannot generate SOAP notes: appointment ID not found', {
              action: 'startTranscriptionPolling',
              record_id: recordId,
            });
          }
        }
      } catch (error) {
        logger.error('Error in transcription polling interval', {
          action: 'startTranscriptionPolling',
          record_id: recordId,
          error,
        });
        clearInterval(intervalId);

        dispatch(setTranscriptionPollActive(false));
      }
    }, 10000); 

    return;
  },
);

export const startRecordCompletionPolling = createAsyncThunk<
  void,
  number, 
  {dispatch: any; state: {appointments: AppointmentsState}}
>(
  'appointments/startRecordCompletionPolling',
  async (recordId, {dispatch, getState}) => {
    logger.info('Starting record completion polling', {
      action: 'startRecordCompletionPolling',
      record_id: recordId,
    });

    const intervalId = setInterval(async () => {
      const state = getState();

      if (
        !state.appointments.recordCompletePollActive ||
        state.appointments.recordCompleteStatus?.status === 'completed'
      ) {
        logger.info('Stopping record completion polling', {
          action: 'startRecordCompletionPolling',
          record_id: recordId,
          is_active: state.appointments.recordCompletePollActive,
          status: state.appointments.recordCompleteStatus?.status,
        });
        clearInterval(intervalId);

        if (state.appointments.recordCompleteStatus?.status === 'completed') {
          logger.info('Record is completed, starting transcription polling', {
            action: 'startRecordCompletionPolling',
            record_id: recordId,
          });

          dispatch(setTranscriptionPollActive(true));

          dispatch(getTranscriptionStatusAction(recordId));

          dispatch(startTranscriptionPolling(recordId));
        }

        return;
      }

      try {
        const result = await dispatch(
          checkRecordCompleteAction({record_id: recordId}),
        ).unwrap();

        if (result.status === 'completed') {
          logger.info('Record processing completed, stopping polling', {
            action: 'startRecordCompletionPolling',
            record_id: recordId,
            status: result.status,
          });
          clearInterval(intervalId);

          dispatch(setRecordCompletePollActive(false));

          logger.info(
            'Starting transcription polling after record completion',
            {
              action: 'startRecordCompletionPolling',
              record_id: recordId,
            },
          );

          dispatch(setTranscriptionPollActive(true));

          dispatch(getTranscriptionStatusAction(recordId));

          dispatch(startTranscriptionPolling(recordId));
        }
      } catch (error) {
        logger.error('Error in record completion polling interval', {
          action: 'startRecordCompletionPolling',
          record_id: recordId,
          error,
        });
        clearInterval(intervalId);

        dispatch(setRecordCompletePollActive(false));
      }
    }, 10000); 

    return;
  },
);

export const generateSoapNotesAction = createAsyncThunk<
  SoapNoteGenerationResponse,
  number,
  {rejectValue: string; dispatch: any}
>('appointments/generateSoapNotes', async (appointmentId, {rejectWithValue, dispatch}) => {
  try {
    logger.info('Initiating SOAP note generation:', {
      action: 'generateSoapNotesAction',
      appointment_id: appointmentId,
    });

    const response = await appointmentService.generateSoapNotes(appointmentId);

    if (!response.success || !response.data) {
      logger.error('Failed to initiate SOAP note generation', {
        action: 'generateSoapNotesAction',
        appointment_id: appointmentId,
        error: response.error,
      });
      return rejectWithValue(
        response.error?.message || 'Failed to initiate SOAP note generation',
      );
    }

    const responseWithAppointmentId = {
      ...response.data,
      appointment_id: appointmentId,
    };

    logger.info('SOAP note generation initiated successfully:', {
      action: 'generateSoapNotesAction',
      appointment_id: appointmentId,
      status: responseWithAppointmentId.soap_note_generation_status,
      updated_at: responseWithAppointmentId.updated_at,
    });
    
    if (responseWithAppointmentId.soap_note_generation_status === 'pending' || 
        responseWithAppointmentId.soap_note_generation_status === 'in_progress') {
      logger.info('Starting SOAP note generation status polling', {
        action: 'generateSoapNotesAction',
        appointment_id: appointmentId,
        status: responseWithAppointmentId.soap_note_generation_status,
      });

      dispatch(setSoapNotePollActive(true));
      dispatch(getSoapNoteStatusAction(appointmentId));
      dispatch(startSoapNotePolling(appointmentId));
    }

    return responseWithAppointmentId;
  } catch (error: any) {
    logger.error('Exception in generateSoapNotesAction', {
      action: 'generateSoapNotesAction',
      appointment_id: appointmentId,
      error: error.message || 'Unknown error',
    });
    return rejectWithValue(
      error.message ||
        'An unknown error occurred while initiating SOAP note generation',
    );
  }
});

export const getSoapNoteStatusAction = createAsyncThunk<
  SoapNoteGenerationResponse,
  number, 
  {rejectValue: string}
>(
  'appointments/getSoapNoteStatus',
  async (appointmentId, {rejectWithValue}) => {
    try {
      logger.info('Checking SOAP note generation status:', {
        action: 'getSoapNoteStatusAction',
        appointment_id: appointmentId,
      });

      const response = await appointmentService.getSoapNoteStatus(
        appointmentId,
      );

      if (!response.success || !response.data) {
        logger.error('Failed to get SOAP note generation status', {
          action: 'getSoapNoteStatusAction',
          appointment_id: appointmentId,
          error: response.error,
        });
        return rejectWithValue(
          response.error?.message || 'Failed to get SOAP note generation status',
        );
      }

      const responseWithAppointmentId = {
        ...response.data,
        appointment_id: appointmentId,
      };

      logger.info('SOAP note generation status check result:', {
        action: 'getSoapNoteStatusAction',
        appointment_id: appointmentId,
        status: responseWithAppointmentId.soap_note_generation_status,
        updated_at: responseWithAppointmentId.updated_at,
      });

      return responseWithAppointmentId;
    } catch (error: any) {
      logger.error('Exception in getSoapNoteStatusAction', {
        action: 'getSoapNoteStatusAction',
        appointment_id: appointmentId,
        error: error.message || 'Unknown error',
      });
      return rejectWithValue(
        error.message ||
          'An unknown error occurred while getting SOAP note generation status',
      );
    }
  },
);

export const startSoapNotePolling = createAsyncThunk<
  void,
  number, 
  {dispatch: any; state: {appointments: AppointmentsState}}
>(
  'appointments/startSoapNotePolling',
  async (appointmentId, {dispatch, getState}) => {
    logger.info('Starting SOAP note generation status polling', {
      action: 'startSoapNotePolling',
      appointment_id: appointmentId,
    });

    const intervalId = setInterval(async () => {
      const state = getState();

      if (
        !state.appointments.soapNotePollActive ||
        state.appointments.soapNoteGenerationStatus?.soap_note_generation_status === 'completed'
      ) {
        logger.info('Stopping SOAP note generation status polling', {
          action: 'startSoapNotePolling',
          appointment_id: appointmentId,
          is_active: state.appointments.soapNotePollActive,
          status: state.appointments.soapNoteGenerationStatus?.soap_note_generation_status,
        });
        clearInterval(intervalId);

        if (
          state.appointments.soapNoteGenerationStatus?.soap_note_generation_status === 'completed'
        ) {
          logger.info(
            'SOAP note generation is completed, fetching SOAP note data',
            {
              action: 'startSoapNotePolling',
              appointment_id: appointmentId,
            },
          );
          
          // Fetch the SOAP note data when status is completed
          dispatch(getSoapNoteDataAction(appointmentId));
        }

        return;
      }

      try {
        const result = await dispatch(
          getSoapNoteStatusAction(appointmentId),
        ).unwrap();

        if (result.soap_note_generation_status === 'in_progress') {
          logger.info('SOAP note generation in progress', {
            action: 'startSoapNotePolling',
            appointment_id: appointmentId,
            status: result.soap_note_generation_status,
            updated_at: result.updated_at,
          });
        }
        else if (result.soap_note_generation_status === 'pending') {
          logger.info('SOAP note generation pending', {
            action: 'startSoapNotePolling',
            appointment_id: appointmentId,
            status: result.soap_note_generation_status,
            updated_at: result.updated_at,
          });
        }
        else if (result.soap_note_generation_status === 'completed') {
          logger.info('SOAP note generation completed, stopping polling', {
            action: 'startSoapNotePolling',
            appointment_id: appointmentId,
            status: result.soap_note_generation_status,
            updated_at: result.updated_at,
          });
          clearInterval(intervalId);

          dispatch(setSoapNotePollActive(false));
          
          // Fetch the SOAP note data when status is completed
          logger.info('Fetching SOAP note data after completion', {
            action: 'startSoapNotePolling',
            appointment_id: appointmentId,
          });
          
          dispatch(getSoapNoteDataAction(appointmentId));
        }
        else {
          logger.warn('Unexpected SOAP note generation status', {
            action: 'startSoapNotePolling',
            appointment_id: appointmentId,
            status: result.soap_note_generation_status,
            updated_at: result.updated_at,
          });
        }
      } catch (error) {
        logger.error('Error in SOAP note polling interval', {
          action: 'startSoapNotePolling',
          appointment_id: appointmentId,
          error,
        });
        clearInterval(intervalId);

        dispatch(setSoapNotePollActive(false));
      }
    }, 10000); 

    return;
  },
);

export const getSoapNoteDataAction = createAsyncThunk<
  SoapNoteDataResponse,
  number,
  {rejectValue: string}
>(
  'appointments/getSoapNoteData',
  async (appointmentId, {rejectWithValue}) => {
    try {
      logger.info('Fetching SOAP note data:', {
        action: 'getSoapNoteDataAction',
        appointment_id: appointmentId,
      });

      const response = await appointmentService.getSoapNoteData(
        appointmentId,
      );

      if (!response.success || !response.data) {
        logger.error('Failed to fetch SOAP note data', {
          action: 'getSoapNoteDataAction',
          appointment_id: appointmentId,
          error: response.error,
        });
        return rejectWithValue(
          response.error?.message || 'Failed to fetch SOAP note data',
        );
      }

      logger.info('SOAP note data fetched successfully:', {
        action: 'getSoapNoteDataAction',
        appointment_id: appointmentId,
        soap_note_id: response.data.id,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Exception in getSoapNoteDataAction', {
        action: 'getSoapNoteDataAction',
        appointment_id: appointmentId,
        error: error.message || 'Unknown error',
      });
      return rejectWithValue(
        error.message ||
          'An unknown error occurred while fetching SOAP note data',
      );
    }
  },
);

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState,
  reducers: {
    updateParams: (
      state,
      action: PayloadAction<Partial<GetAppointmentsParams>>,
    ) => {
      state.currentParams = {
        ...state.currentParams,
        ...action.payload,
      };
    },
    clearAppointments: state => {
      state.appointments = [];
      state.total = 0;
    },
    clearError: state => {
      state.error = null;
    },
    setRecordCompletePollActive: (state, action: PayloadAction<boolean>) => {
      state.recordCompletePollActive = action.payload;
    },
    setTranscriptionPollActive: (state, action: PayloadAction<boolean>) => {
      state.transcriptionPollActive = action.payload;
    },
    setSoapNotePollActive: (state, action: PayloadAction<boolean>) => {
      state.soapNotePollActive = action.payload;
    },
    resetRecord: state => {
      state.record = null;
    },
    clearSoapNoteData: state => {
      state.soapNoteData = null;
      logger.info('SOAP note data cleared');
    },
    setSelectedTimePeriod: (state, action: PayloadAction<number>) => {
      state.selectedTimePeriod = action.payload;
      logger.info('Selected time period updated:', { selectedTimePeriod: action.payload });
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchAppointments.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAppointments.fulfilled,
        (state, action: PayloadAction<AppointmentListResponse>) => {
          state.loading = false;
          state.appointments = action.payload.results || [];
          state.total = action.payload.count || 0;
          state.error = null;
        },
      )
      .addCase(fetchAppointments.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'An error occurred';
      })
      .addCase(createRecord.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        createRecord.fulfilled,
        (state, action: PayloadAction<CreateRecordResponse>) => {
          state.loading = false;
          state.record = action.payload;
          state.error = null;
        },
      )
      .addCase(createRecord.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || 'An error occurred creating record';
      })
      .addCase(fetchAppointmentDetail.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchAppointmentDetail.fulfilled,
        (state, action: PayloadAction<Appointment>) => {
          state.loading = false;
          state.selectedAppointmentDetail = action.payload;
          state.error = null;
        },
      )
      .addCase(fetchAppointmentDetail.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          'An error occurred fetching appointment details';
      })
      .addCase(getAudioRecordingSignedUrl.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getAudioRecordingSignedUrl.fulfilled,
        (state, action: PayloadAction<SignedUrlResponse>) => {
          state.loading = false;
          state.signedUrlResponse = action.payload;
          state.error = null;
        },
      )
      .addCase(getAudioRecordingSignedUrl.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || 'An error occurred getting signed URL';
      })
      .addCase(transcribeAudioChunkAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        transcribeAudioChunkAction.fulfilled,
        (state, action: PayloadAction<TranscribeAudioChunkResponse>) => {
          state.loading = false;
          state.transcribeAudioChunk = action.payload;
          state.error = null;
        },
      )
      .addCase(transcribeAudioChunkAction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          'An error occurred transcribing audio chunk';
      })
      .addCase(uploadToS3Action.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        uploadToS3Action.fulfilled,
        (state, action: PayloadAction<S3UploadResponse>) => {
          state.loading = false;
          state.s3UploadResult = action.payload;
          state.error = null;
        },
      )
      .addCase(uploadToS3Action.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) || 'An error occurred uploading to S3';
      })
      .addCase(checkRecordCompleteAction.pending, state => {
        state.error = null;
      })
      .addCase(
        checkRecordCompleteAction.fulfilled,
        (state, action: PayloadAction<RecordCompleteResponse>) => {
          state.recordCompleteStatus = action.payload;
          state.error = null;
        },
      )
      .addCase(checkRecordCompleteAction.rejected, (state, action) => {
        state.error =
          (action.payload as string) ||
          'An error occurred checking record status';
      })
      .addCase(startRecordCompletionPolling.pending, state => {
        state.recordCompletePollActive = true;
      })
      .addCase(startRecordCompletionPolling.fulfilled, state => {
      })
      .addCase(startRecordCompletionPolling.rejected, state => {
        state.recordCompletePollActive = false;
      })
      .addCase(getTranscriptionStatusAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getTranscriptionStatusAction.fulfilled,
        (state, action: PayloadAction<TranscriptionStatusResponse>) => {
          state.loading = false;
          state.transcriptionStatus = action.payload;
          state.error = null;
        },
      )
      .addCase(getTranscriptionStatusAction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          'An error occurred getting transcription status';
      })
      .addCase(startTranscriptionPolling.pending, state => {
        state.transcriptionPollActive = true;
      })
      .addCase(startTranscriptionPolling.fulfilled, state => {
      })
      .addCase(startTranscriptionPolling.rejected, state => {
        state.transcriptionPollActive = false;
      })
      .addCase(generateSoapNotesAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        generateSoapNotesAction.fulfilled,
        (state, action: PayloadAction<SoapNoteGenerationResponse>) => {
          state.loading = false;
          state.soapNoteGenerationStatus = action.payload;
          state.error = null;
        },
      )
      .addCase(generateSoapNotesAction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          'An error occurred generating SOAP notes';
      })
      .addCase(getSoapNoteStatusAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getSoapNoteStatusAction.fulfilled,
        (state, action: PayloadAction<SoapNoteGenerationResponse>) => {
          state.loading = false;
          state.soapNoteGenerationStatus = action.payload;
          state.error = null;
        },
      )
      .addCase(getSoapNoteStatusAction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          'An error occurred getting SOAP note status';
      })
      .addCase(startSoapNotePolling.pending, state => {
        state.soapNotePollActive = true;
      })
      .addCase(startSoapNotePolling.fulfilled, state => {
      })
      .addCase(startSoapNotePolling.rejected, state => {
        state.soapNotePollActive = false;
      })
      .addCase(getSoapNoteDataAction.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getSoapNoteDataAction.fulfilled,
        (state, action: PayloadAction<SoapNoteDataResponse>) => {
          state.loading = false;
          state.soapNoteData = action.payload;
          state.error = null;
        },
      )
      .addCase(getSoapNoteDataAction.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ||
          'An error occurred fetching SOAP note data';
      });
  },
});

export const {
  updateParams,
  clearAppointments,
  clearError,
  setRecordCompletePollActive,
  setTranscriptionPollActive,
  setSoapNotePollActive,
  resetRecord,
  clearSoapNoteData,
  setSelectedTimePeriod,
} = appointmentsSlice.actions;

export default appointmentsSlice.reducer;
