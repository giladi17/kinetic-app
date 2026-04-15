import { useState, useEffect, useCallback } from "react";
import { useGame } from "../context/GameContext";
import {
  registerUser,
  searchUserByNickname,
  sendFriendRequest,
  subscribeIncomingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  subscribeFriendsList,
  getFriendProfile,
} from "../utils/friendService";
import AvatarDisplay from "./AvatarDisplay";
import { getPlayerTitle } from "../data/titles";
import { getAvatarById } from "../data/avatars";

const NICK_KEY = "whooops_nickname";

export default function FriendsList() {
  const { state, dispatch } = useGame();
  const [tab, setTab] = useState("friends");
  const [searchName, setSearchName] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [sentMsg, setSentMsg] = useState("");
  const [requests, setRequests] = useState({});
  const [friendUIDs, setFriendUIDs] = useState({});
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  const nickname = localStorage.getItem(NICK_KEY) || "Player";

  useEffect(() => {
    registerUser(nickname, state.selectedAvatar, state.completedLevels.length);
  }, [nickname, state.selectedAvatar, state.completedLevels.length]);

  useEffect(() => {
    const unsub = subscribeIncomingRequests(setRequests);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeFriendsList(setFriendUIDs);
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const uids = Object.keys(friendUIDs);
    if (uids.length === 0) {
      setFriends([]);
      setLoadingFriends(false);
      return;
    }
    setLoadingFriends(true);
    Promise.all(uids.map((uid) => getFriendProfile(uid))).then((profiles) => {
      if (!cancelled) {
        setFriends(profiles.filter(Boolean));
        setLoadingFriends(false);
      }
    });
    return () => { cancelled = true; };
  }, [friendUIDs]);

  const handleSearch = useCallback(async () => {
    if (searchName.trim().length < 2) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    setSentMsg("");
    const user = await searchUserByNickname(searchName.trim());
    if (user) {
      setSearchResult(user);
    } else {
      setSearchError("No player found with that name.");
    }
    setSearching(false);
  }, [searchName]);

  const handleSendRequest = async () => {
    if (!searchResult) return;
    await sendFriendRequest(searchResult.uid, nickname, state.selectedAvatar);
    setSentMsg("Friend request sent!");
    setSearchResult(null);
  };

  const handleAccept = async (senderUID) => {
    await acceptFriendRequest(senderUID);
  };

  const handleDecline = async (senderUID) => {
    await declineFriendRequest(senderUID);
  };

  const handleChallenge = (friend) => {
    dispatch({ type: "SET_SCREEN", screen: "duel" });
  };

  const requestList = Object.entries(requests);

  const tabs = [
    { id: "friends", label: `Friends (${Object.keys(friendUIDs).length})` },
    { id: "requests", label: `Requests${requestList.length > 0 ? ` (${requestList.length})` : ""}` },
    { id: "add", label: "Add Friend" },
  ];

  return (
    <div>
      <h3 className="text-base font-extrabold text-text mb-3 px-1 flex items-center gap-2">
        <span className="text-lg">{"\u{1F465}"}</span> Friends
      </h3>

      <div className="flex gap-1.5 mb-4 bg-white/[0.03] rounded-xl p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all
                    ${tab === t.id
                      ? "gradient-primary text-white shadow-[0_2px_10px_rgba(139,92,246,0.3)]"
                      : "text-text-muted hover:text-text"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        <div className="flex flex-col gap-2">
          {loadingFriends ? (
            <p className="text-text-muted text-sm text-center py-4">Loading...</p>
          ) : friends.length === 0 ? (
            <div className="text-center py-6 flex flex-col items-center gap-2">
              <span className="text-3xl">{"\u{1F465}"}</span>
              <p className="text-text-muted text-sm">No friends yet. Add some!</p>
            </div>
          ) : (
            friends.map((f) => {
              const title = getPlayerTitle(f.levelsCompleted || 0);
              return (
                <div key={f.uid} className="flex items-center gap-3 p-3 rounded-2xl"
                     style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <AvatarDisplay avatarId={f.avatar || "astronaut"} size="topbar" />
                  <div className="flex-1 min-w-0">
                    <p className="text-text font-bold text-sm truncate">{f.duelNickname || "Player"}</p>
                    <p className="text-[10px] text-text-muted">
                      {title.emoji} {title.name} {"\u00B7"} {f.levelsCompleted || 0} levels
                    </p>
                  </div>
                  <button onClick={() => handleChallenge(f)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer active:scale-95 transition-all"
                          style={{ background: "linear-gradient(135deg, #F59E0B, #D97706)" }}>
                    {"\u26A1"} Challenge
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "requests" && (
        <div className="flex flex-col gap-2">
          {requestList.length === 0 ? (
            <div className="text-center py-6 flex flex-col items-center gap-2">
              <span className="text-3xl">{"\u{1F514}"}</span>
              <p className="text-text-muted text-sm">No pending requests.</p>
            </div>
          ) : (
            requestList.map(([uid, req]) => (
              <div key={uid} className="flex items-center gap-3 p-3 rounded-2xl"
                   style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <AvatarDisplay avatarId={req.avatar || "astronaut"} size="topbar" />
                <div className="flex-1 min-w-0">
                  <p className="text-text font-bold text-sm truncate">{req.name}</p>
                  <p className="text-[10px] text-text-muted">wants to be friends</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleAccept(uid)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer active:scale-95 transition-all bg-correct">
                    Accept
                  </button>
                  <button onClick={() => handleDecline(uid)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-text-muted cursor-pointer active:scale-95 transition-all glass">
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Enter username..."
              maxLength={16}
              className="flex-1 px-4 py-2.5 rounded-xl text-text font-semibold text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(124,58,237,0.3)" }}
            />
            <button onClick={handleSearch} disabled={searching || searchName.trim().length < 2}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer active:scale-95 transition-all"
                    style={{ background: "linear-gradient(135deg, #7C3AED, #9333EA)" }}>
              {searching ? "..." : "Search"}
            </button>
          </div>

          {searchError && <p className="text-wrong text-xs font-semibold">{searchError}</p>}
          {sentMsg && <p className="text-correct text-xs font-semibold">{sentMsg}</p>}

          {searchResult && (
            <div className="flex items-center gap-3 p-3 rounded-2xl animate-fade-in"
                 style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <AvatarDisplay avatarId={searchResult.avatar || "astronaut"} size="topbar" />
              <div className="flex-1 min-w-0">
                <p className="text-text font-bold text-sm truncate">{searchResult.duelNickname}</p>
                <p className="text-[10px] text-text-muted">
                  {getPlayerTitle(searchResult.levelsCompleted || 0).emoji} {getPlayerTitle(searchResult.levelsCompleted || 0).name}
                </p>
              </div>
              <button onClick={handleSendRequest}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer active:scale-95 transition-all"
                      style={{ background: "linear-gradient(135deg, #7C3AED, #9333EA)" }}>
                Add Friend
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
