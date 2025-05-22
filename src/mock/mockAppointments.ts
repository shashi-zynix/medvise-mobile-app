import { Appointment } from '../api/appointmentService';

export const mockAppointments: Appointment[] = [
  {
    id: 1,
    identifier: 'APT001',
    appointment_name: 'Abdeljaleel Alnahhar',
    appointment_time: '2025-05-09T14:00:00Z',
    appointment_start_time: '2025-05-09T14:00:00Z',
    appointment_type: 'regular',
    doctor: 1,
    patient: 101,
    reason_for_visit: 'Annual checkup',
    metadata: {
      age: '54',
      sex_at_birth: 'M'
    },
    appointment_status: 'scheduled',
    emr_push_status: 'pending'
  },
  {
    id: 2,
    identifier: 'APT002',
    appointment_name: 'Abdeljaleel Alnahhar',
    appointment_time: '2025-05-09T14:00:00Z',
    appointment_start_time: '2025-05-09T14:00:00Z',
    appointment_type: 'regular',
    doctor: 1,
    patient: 102,
    reason_for_visit: 'Follow-up',
    metadata: {
      age: '54',
      sex_at_birth: 'F'
    },
    appointment_status: 'scheduled',
    emr_push_status: 'pending'
  },
  {
    id: 3,
    identifier: 'APT003',
    appointment_name: 'Abdeljaleel Alnahhar',
    appointment_time: '2025-05-09T14:00:00Z',
    appointment_start_time: '2025-05-09T14:00:00Z',
    appointment_type: 'regular',
    doctor: 1,
    patient: 103,
    reason_for_visit: 'Consultation',
    metadata: {
      age: '54',
      sex_at_birth: 'M'
    },
    appointment_status: 'scheduled',
    emr_push_status: 'pending'
  },
  {
    id: 4,
    identifier: 'APT004',
    appointment_name: 'Abdeljaleel Alnahhar',
    appointment_time: '2025-05-09T14:00:00Z',
    appointment_start_time: '2025-05-09T14:00:00Z',
    appointment_type: 'adhoc',
    doctor: 1,
    patient: 104,
    reason_for_visit: 'Urgent care',
    metadata: {
      age: '54',
      sex_at_birth: 'F'
    },
    appointment_status: 'scheduled',
    emr_push_status: 'pending'
  },
  {
    id: 5,
    identifier: 'APT005',
    appointment_name: 'Abdeljaleel Alnahhar',
    appointment_time: '2025-05-09T14:00:00Z',
    appointment_start_time: '2025-05-09T14:00:00Z',
    appointment_type: 'regular',
    doctor: 1,
    patient: 105,
    reason_for_visit: 'Routine checkup',
    metadata: {
      age: '54',
      sex_at_birth: 'F'
    },
    appointment_status: 'scheduled',
    emr_push_status: 'pending'
  },
  {
    id: 6,
    identifier: 'APT006',
    appointment_name: 'Sarah Johnson',
    appointment_time: '2025-05-09T10:30:00Z',
    appointment_start_time: '2025-05-09T10:30:00Z',
    appointment_type: 'adhoc',
    doctor: 1,
    patient: 106,
    reason_for_visit: 'Medication review',
    metadata: {
      age: '42',
      sex_at_birth: 'F'
    },
    appointment_status: 'in_progress',
    emr_push_status: 'pending'
  },
  {
    id: 7,
    identifier: 'APT007',
    appointment_name: 'Michael Chen',
    appointment_time: '2025-05-09T11:45:00Z',
    appointment_start_time: '2025-05-09T11:45:00Z',
    appointment_type: 'regular',
    doctor: 1,
    patient: 107,
    reason_for_visit: 'Blood test results',
    metadata: {
      age: '36',
      sex_at_birth: 'M'
    },
    appointment_status: 'in_progress',
    emr_push_status: 'pending'
  },
  {
    id: 8,
    identifier: 'APT008',
    appointment_name: 'James Rodriguez',
    appointment_time: '2025-05-09T09:15:00Z',
    appointment_start_time: '2025-05-09T09:15:00Z',
    appointment_type: 'regular',
    doctor: 1,
    patient: 108,
    reason_for_visit: 'Vaccination',
    metadata: {
      age: '62',
      sex_at_birth: 'M'
    },
    appointment_status: 'in_progress',
    emr_push_status: 'pending'
  },
  {
    id: 9,
    identifier: 'APT009',
    appointment_name: 'Emma Williams',
    appointment_time: '2025-05-08T14:30:00Z',
    appointment_start_time: '2025-05-08T14:30:00Z',
    appointment_type: 'regular',
    doctor: 1,
    patient: 109,
    reason_for_visit: 'Annual physical',
    metadata: {
      age: '29',
      sex_at_birth: 'F'
    },
    appointment_status: 'completed',
    emr_push_status: 'success'
  },
  {
    id: 10,
    identifier: 'APT010',
    appointment_name: 'Robert Lee',
    appointment_time: '2025-05-08T15:45:00Z',
    appointment_start_time: '2025-05-08T15:45:00Z',
    appointment_type: 'adhoc',
    doctor: 1,
    patient: 110,
    reason_for_visit: 'Skin rash',
    metadata: {
      age: '48',
      sex_at_birth: 'M'
    },
    appointment_status: 'completed',
    emr_push_status: 'success'
  }
];

export default mockAppointments;
