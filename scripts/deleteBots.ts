import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load firebase config from json file
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error('firebase-applet-config.json not found!');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId) 
  : getFirestore(app);

const BOT_NAMES_PATTERNS = [/mai lan/i, /lucas/i, /bot/i, /assistant/i, /ban quản lý/i, /system/i, /thảo vy/i, /tuấn anh/i, /bảo minh/i];
const BOT_IDS = ['u_lan', 'u_lucas', 'u_thao_vy', 'u_tuan_anh', 'u_bao_minh', 'bot', 'assistant', 'bot_1', 'bot_2', 'p_1', 'p_2', 'p_3'];

function isBotUser(userId?: string, userName?: string): boolean {
  if (userId && BOT_IDS.includes(userId)) return true;
  if (userName) {
    for (const pattern of BOT_NAMES_PATTERNS) {
      if (pattern.test(userName)) return true;
    }
  }
  return false;
}

async function cleanDatabase() {
  console.log('🚀 Starting bot cleanup script for Firestore...');

  // 1. Posts
  try {
    const postsSnap = await getDocs(collection(db, 'posts'));
    console.log(`Checking ${postsSnap.docs.length} posts in Firestore...`);
    let deletedPostsCount = 0;
    for (const d of postsSnap.docs) {
      const data = d.data();
      const uId = data.user?.id || data.authorId;
      const uName = data.user?.name || data.authorName;
      if (isBotUser(uId, uName) || isBotUser(d.id)) {
        await deleteDoc(doc(db, 'posts', d.id));
        deletedPostsCount++;
        console.log(`Deleted bot post: ${d.id} (${uName || uId})`);
      }
    }
    console.log(`✅ Deleted ${deletedPostsCount} bot posts.`);
  } catch (err) {
    console.error('Error cleaning posts:', err);
  }

  // 2. Users
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    console.log(`Checking ${usersSnap.docs.length} users in Firestore...`);
    let deletedUsersCount = 0;
    for (const d of usersSnap.docs) {
      const data = d.data();
      if (isBotUser(d.id, data.name)) {
        await deleteDoc(doc(db, 'users', d.id));
        deletedUsersCount++;
        console.log(`Deleted bot user doc: ${d.id} (${data.name})`);
      }
    }
    console.log(`✅ Deleted ${deletedUsersCount} bot user documents.`);
  } catch (err) {
    console.error('Error cleaning users:', err);
  }

  // 3. Tutors
  try {
    const tutorsSnap = await getDocs(collection(db, 'tutors'));
    console.log(`Checking ${tutorsSnap.docs.length} tutors in Firestore...`);
    let deletedTutorsCount = 0;
    for (const d of tutorsSnap.docs) {
      const data = d.data();
      if (isBotUser(d.id, data.name) || isBotUser(data.userId, data.name)) {
        await deleteDoc(doc(db, 'tutors', d.id));
        deletedTutorsCount++;
        console.log(`Deleted bot tutor: ${d.id} (${data.name})`);
      }
    }
    console.log(`✅ Deleted ${deletedTutorsCount} bot tutors.`);
  } catch (err) {
    console.error('Error cleaning tutors:', err);
  }

  // 4. Reels
  try {
    const reelsSnap = await getDocs(collection(db, 'reels'));
    console.log(`Checking ${reelsSnap.docs.length} reels in Firestore...`);
    let deletedReelsCount = 0;
    for (const d of reelsSnap.docs) {
      const data = d.data();
      if (isBotUser(data.authorId, data.authorName) || isBotUser(d.id)) {
        await deleteDoc(doc(db, 'reels', d.id));
        deletedReelsCount++;
        console.log(`Deleted bot reel: ${d.id}`);
      }
    }
    console.log(`✅ Deleted ${deletedReelsCount} bot reels.`);
  } catch (err) {
    console.error('Error cleaning reels:', err);
  }

  // 5. Marketplace
  try {
    const marketSnap = await getDocs(collection(db, 'marketplace'));
    console.log(`Checking ${marketSnap.docs.length} marketplace items in Firestore...`);
    let deletedMarketCount = 0;
    for (const d of marketSnap.docs) {
      const data = d.data();
      if (isBotUser(data.sellerId, data.sellerName) || isBotUser(d.id)) {
        await deleteDoc(doc(db, 'marketplace', d.id));
        deletedMarketCount++;
        console.log(`Deleted bot marketplace item: ${d.id}`);
      }
    }
    console.log(`✅ Deleted ${deletedMarketCount} bot marketplace items.`);
  } catch (err) {
    console.error('Error cleaning marketplace:', err);
  }

  // 6. Group Chats (Filter out messages sent by bots)
  try {
    const chatSnap = await getDocs(collection(db, 'groupChats'));
    console.log(`Checking ${chatSnap.docs.length} group chats in Firestore...`);
    for (const d of chatSnap.docs) {
      const data = d.data();
      if (Array.isArray(data.messages)) {
        const cleanedMessages = data.messages.filter((msg: any) => !isBotUser(msg.sender?.id, msg.sender?.name));
        if (cleanedMessages.length !== data.messages.length) {
          await updateDoc(doc(db, 'groupChats', d.id), { messages: cleanedMessages });
          console.log(`Cleaned bot messages from group chat: ${d.id}`);
        }
      }
    }
    console.log(`✅ Cleaned bot messages in group chats.`);
  } catch (err) {
    console.error('Error cleaning group chats:', err);
  }

  console.log('🎉 Bot deletion script completed successfully!');
  process.exit(0);
}

cleanDatabase();
