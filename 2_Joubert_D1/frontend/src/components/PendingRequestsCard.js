import React, { useEffect, useState } from 'react';
import '../styles/PendingRequestsCard.css';
import { resolveProfileImage } from '../utils/avatar';

const PendingRequestsCard = ({ user, onUserUpdate }) => {
  const [pending, setPending] = useState(user?.pendingFriendRequests || []);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setPending(user?.pendingFriendRequests || []);
  }, [user?.pendingFriendRequests]);

  if (!pending.length) {
    return null;
  }

  const handleRequestAction = async (requesterId, action) => {
    if (!user?.id) return;
    setBusyId(requesterId);
    setError('');

    const endpoint =
      action === 'accept'
        ? `/api/users/${user.id}/friend-requests/${requesterId}/accept`
        : `/api/users/${user.id}/friend-requests/${requesterId}/decline`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Unable to update friend request.');
        return;
      }

      if (onUserUpdate && data.user) {
        onUserUpdate(data.user);
      }

      setPending((previous) => previous.filter((item) => item.id !== requesterId));
    } catch (requestError) {
      setError('Network error while updating friend request.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="pending-requests">
      <h3 className="pending-requests__title">
        &gt; PENDING_REQUESTS <span className="pending-requests__count">({pending.length})</span>
      </h3>

      <ul className="pending-requests__list">
        {pending.map((request) => (
          <li key={request.id} className="pending-requests__item">
            <div className="pending-requests__user">
              <img
                src={resolveProfileImage(request.profileImage, request.id || request.username, 64)}
                alt={request.username}
                className="pending-requests__avatar"
              />
              <span className="pending-requests__name">{request.username}</span>
            </div>
            <div className="pending-requests__actions">
              <button
                type="button"
                className="pending-requests__button pending-requests__button--accept"
                disabled={busyId === request.id}
                onClick={() => handleRequestAction(request.id, 'accept')}
              >
                Accept
              </button>
              <button
                type="button"
                className="pending-requests__button pending-requests__button--decline"
                disabled={busyId === request.id}
                onClick={() => handleRequestAction(request.id, 'decline')}
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>

      {error && <div className="pending-requests__error">ERROR: {error}</div>}
    </div>
  );
};

export default PendingRequestsCard;
