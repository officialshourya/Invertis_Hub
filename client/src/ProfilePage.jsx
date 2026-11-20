import React, { useEffect, useState } from 'react';
import {
  UserRound,
  GraduationCap,
  Mail,
  Phone,
  Camera,
  Save,
  Pencil,
  BookOpen,
  Building2,
  Hash,
  CalendarDays,
  LoaderCircle
} from 'lucide-react';

export default function ProfilePage({
  request,
  user,
  onUserUpdate,
  setNotice
}) {
  const [profile, setProfile] = useState({
    photoUrl: '',
    fullName: '',
    mobile: '',
    studentId: '',
    course: '',
    branch: '',
    specialization: '',
    department: '',
    year: '',
    semester: ''
  });

  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'student');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const data = await request('/api/profile');

        if (!mounted) return;

        setProfile(prev => ({
          ...prev,
          ...(data.profile || {})
        }));

        setEmail(data.user?.email || user?.email || '');
        setRole(data.user?.role || user?.role || 'student');
      } catch (error) {
        if (mounted) {
          setNotice?.(error.message || 'Could not load profile.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  async function saveProfile() {
    setSaving(true);

    try {
      const data = await request('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profile)
      });

      setProfile(prev => ({
        ...prev,
        ...(data.profile || {})
      }));

      if (data.user) {
        onUserUpdate?.(data.user);
        setEmail(data.user.email || email);
        setRole(data.user.role || role);
      }

      setEditing(false);
      setNotice?.('Profile saved successfully.');
    } catch (error) {
      setNotice?.(error.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  const initials = (profile.fullName || user?.name || 'Student')
    .trim()
    .charAt(0)
    .toUpperCase();

  if (loading) {
    return (
      <div className="profile-loading">
        <LoaderCircle className="profile-spinner" size={28} />
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-heading">
        <div>
          <span className="profile-eyebrow">YOUR ACCOUNT</span>
          <h1>My Profile</h1>
          <p>Manage your personal and academic information.</p>
        </div>

        <button
          className="profile-edit-btn"
          onClick={() => setEditing(!editing)}
          type="button"
        >
          <Pencil size={16} />
          {editing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <section className="profile-hero">
        <div className="profile-avatar">
          {profile.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt="Profile"
              onError={e => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        <div className="profile-hero-info">
          <h2>{profile.fullName || user?.name || 'Student'}</h2>
          <p>{email}</p>
          <span className="profile-role">
            {role === 'admin' ? 'Administrator' : 'Student'}
          </span>
        </div>
      </section>

      <section className="profile-card">
        <div className="profile-card-heading">
          <div className="profile-section-icon">
            <UserRound size={19} />
          </div>
          <div>
            <h3>Personal Information</h3>
            <p>Your basic account details</p>
          </div>
        </div>

        {editing && (
          <div className="profile-field full">
            <label>
              <Camera size={15} /> Profile Photo URL
            </label>
            <input
              type="url"
              value={profile.photoUrl}
              onChange={e => updateField('photoUrl', e.target.value)}
              placeholder="https://example.com/photo.jpg"
            />
            <small>Use a public HTTPS image link.</small>
          </div>
        )}

        <div className="profile-grid">
          <div className="profile-field">
            <label><UserRound size={15} /> Full Name</label>
            <input
              value={profile.fullName}
              disabled={!editing}
              onChange={e => updateField('fullName', e.target.value)}
              placeholder="Enter your full name"
              maxLength={100}
            />
          </div>

          <div className="profile-field">
            <label><Mail size={15} /> Email Address</label>
            <input value={email} disabled />
          </div>

          <div className="profile-field">
            <label><Phone size={15} /> Mobile Number</label>
            <input
              value={profile.mobile}
              disabled={!editing}
              onChange={e => updateField('mobile', e.target.value)}
              placeholder="Enter mobile number"
              maxLength={20}
            />
          </div>

          <div className="profile-field">
            <label><Hash size={15} /> Student ID</label>
            <input
              value={profile.studentId}
              disabled={!editing}
              onChange={e => updateField('studentId', e.target.value)}
              placeholder="Enter student ID"
              maxLength={40}
            />
          </div>
        </div>
      </section>

      <section className="profile-card">
        <div className="profile-card-heading">
          <div className="profile-section-icon">
            <GraduationCap size={19} />
          </div>
          <div>
            <h3>Academic Information</h3>
            <p>Your university and course details</p>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-field">
            <label><GraduationCap size={15} /> Course</label>
            <input
              value={profile.course}
              disabled={!editing}
              onChange={e => updateField('course', e.target.value)}
              placeholder="e.g. B.Tech"
              maxLength={100}
            />
          </div>

          <div className="profile-field">
            <label><BookOpen size={15} /> Branch</label>
            <input
              value={profile.branch}
              disabled={!editing}
              onChange={e => updateField('branch', e.target.value)}
              placeholder="e.g. Computer Science"
              maxLength={100}
            />
          </div>

          <div className="profile-field">
            <label><Building2 size={15} /> Department</label>
            <input
              value={profile.department}
              disabled={!editing}
              onChange={e => updateField('department', e.target.value)}
              placeholder="Enter department"
              maxLength={100}
            />
          </div>

          <div className="profile-field">
            <label><BookOpen size={15} /> Specialization</label>
            <input
              value={profile.specialization}
              disabled={!editing}
              onChange={e => updateField('specialization', e.target.value)}
              placeholder="Enter specialization"
              maxLength={100}
            />
          </div>

          <div className="profile-field">
            <label><CalendarDays size={15} /> Academic Year</label>
            <input
              value={profile.year}
              disabled={!editing}
              onChange={e => updateField('year', e.target.value)}
              placeholder="e.g. 1st Year"
              maxLength={30}
            />
          </div>

          <div className="profile-field">
            <label><CalendarDays size={15} /> Semester</label>
            <input
              value={profile.semester}
              disabled={!editing}
              onChange={e => updateField('semester', e.target.value)}
              placeholder="e.g. 1st Semester"
              maxLength={30}
            />
          </div>
        </div>
      </section>

      {editing && (
        <div className="profile-save-area">
          <button
            className="profile-save-btn"
            onClick={saveProfile}
            disabled={saving}
            type="button"
          >
            {saving ? (
              <LoaderCircle className="profile-spinner" size={17} />
            ) : (
              <Save size={17} />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
