import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/api';
import Navbar from './Navbar';

const Profile = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: ''
  });
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        username: user.username || ''
      });
      loadTeams();
      setLoading(false);
    }
  }, [user]);

  const loadTeams = async () => {
    try {
      const response = await fetch(getApiUrl('/api/teams'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error('Error loading teams:', error);
    }
  };

  const handleChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch(getApiUrl('/api/auth/profile'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setEditing(false);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="main-container">
          <div className="loading" style={{ height: '50vh' }}>
            <div className="spinner"></div>
            Loading profile...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="main-container">
        <div className="dashboard-header">
          <h1>Coach Profile</h1>
          <p>Manage your account information and settings</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        <div className="glass-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div className="flex-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ color: 'var(--text-primary)' }}>Personal Information</h3>
            {!editing ? (
              <button 
                className="glass-button primary"
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button 
                  className="glass-button"
                  onClick={() => {
                    setEditing(false);
                    setProfileData({
                      first_name: user.first_name || '',
                      last_name: user.last_name || '',
                      email: user.email || '',
                      username: user.username || ''
                    });
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="glass-button primary"
                  onClick={handleSubmit}
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="first_name">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    className="glass-input"
                    value={profileData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="last_name">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    className="glass-input"
                    value={profileData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="form-label" htmlFor="email">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="glass-input"
                  value={profileData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="username">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="glass-input"
                  value={profileData.username}
                  onChange={handleChange}
                  placeholder="Choose a unique username"
                />
              </div>
            </form>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Name:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{user.first_name} {user.last_name}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Email:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{user.email}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) 0', borderBottom: '1px solid var(--glass-border)' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Username:</span>
                <span style={{ color: 'var(--text-secondary)' }}>{user.username || 'Not set'}</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-md) 0' }}>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>Member Since:</span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card">
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-lg)' }}>
            Your Teams ({teams.length})
          </h3>
          
          {teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--text-tertiary)' }}>
              <p style={{ marginBottom: 'var(--spacing-md)' }}>You haven't created any teams yet.</p>
              <button className="glass-button primary">Create Your First Team</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              {teams.map(team => (
                <div 
                  key={team.id} 
                  style={{ 
                    background: 'var(--glass-tertiary)', 
                    border: '1px solid var(--glass-border)',
                    padding: 'var(--spacing-lg)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  className="team-card"
                >
                  <div className="flex-between">
                    <div>
                      <h4 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-xs)' }}>
                        {team.name}
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                        {team.season} • {team.division}
                      </p>
                    </div>
                    <button className="glass-button">Manage</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Profile;