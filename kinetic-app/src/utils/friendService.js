import { db } from "../firebase";
import { ref, set, get, remove, onValue, query, orderByChild, equalTo } from "firebase/database";

function getDeviceId() {
  let id = localStorage.getItem("whooops_device_id");
  if (!id) {
    id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("whooops_device_id", id);
  }
  return id;
}

export async function registerUser(nickname, avatar, levelsCompleted) {
  if (!db) return;
  try {
    const deviceId = getDeviceId();
    const userRef = ref(db, `users/${deviceId}`);
    await set(userRef, {
      duelNickname: nickname,
      avatar: avatar || "astronaut",
      levelsCompleted: levelsCompleted || 0,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn("Firebase user register failed:", e.message);
  }
}

export async function searchUserByNickname(nickname) {
  if (!db) return null;
  try {
    const usersRef = query(ref(db, "users"), orderByChild("duelNickname"), equalTo(nickname));
    const snapshot = await get(usersRef);
    if (!snapshot.exists()) return null;

    const myId = getDeviceId();
    let result = null;
    snapshot.forEach((child) => {
      if (child.key !== myId) {
        result = { uid: child.key, ...child.val() };
      }
    });
    return result;
  } catch (e) {
    console.warn("Firebase user search failed:", e.message);
    return null;
  }
}

export async function sendFriendRequest(targetUID, myName, myAvatar) {
  if (!db) return;
  try {
    const myId = getDeviceId();
    const reqRef = ref(db, `friendRequests/${targetUID}/${myId}`);
    await set(reqRef, {
      name: myName,
      avatar: myAvatar || "astronaut",
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn("Firebase friend request send failed:", e.message);
  }
}

export function subscribeIncomingRequests(callback) {
  if (!db) { callback({}); return () => {}; }
  const myId = getDeviceId();
  const reqRef = ref(db, `friendRequests/${myId}`);
  return onValue(reqRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  }, () => callback({}));
}

export async function acceptFriendRequest(senderUID) {
  if (!db) return;
  try {
    const myId = getDeviceId();
    await set(ref(db, `users/${myId}/friends/${senderUID}`), true);
    await set(ref(db, `users/${senderUID}/friends/${myId}`), true);
    await remove(ref(db, `friendRequests/${myId}/${senderUID}`));
  } catch (e) {
    console.warn("Firebase accept friend failed:", e.message);
  }
}

export async function declineFriendRequest(senderUID) {
  if (!db) return;
  try {
    const myId = getDeviceId();
    await remove(ref(db, `friendRequests/${myId}/${senderUID}`));
  } catch (e) {
    console.warn("Firebase decline friend failed:", e.message);
  }
}

export function subscribeFriendsList(callback) {
  if (!db) { callback({}); return () => {}; }
  const myId = getDeviceId();
  const friendsRef = ref(db, `users/${myId}/friends`);
  return onValue(friendsRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  }, () => callback({}));
}

export async function getFriendProfile(uid) {
  if (!db) return null;
  try {
    const userRef = ref(db, `users/${uid}`);
    const snapshot = await get(userRef);
    return snapshot.exists() ? { uid, ...snapshot.val() } : null;
  } catch (e) {
    console.warn("Firebase get friend profile failed:", e.message);
    return null;
  }
}
