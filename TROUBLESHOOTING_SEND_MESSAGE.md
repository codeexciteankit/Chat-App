# 🔧 Troubleshooting: Can't Send Messages

## Quick Fix Steps

### Step 1: Check Browser Console
1. Open your browser (the one that can't send)
2. Press F12 to open DevTools
3. Go to **Console** tab
4. Try sending a message
5. Look for any RED error messages

**Tell me what error you see!**

### Step 2: Check Network Tab
1. In DevTools, go to **Network** tab
2. Try sending a message
3. Look for a request to `/api/messages/send/...`
4. Click on it and check:
   - Status code (should be 201)
   - Response data
   - Any errors

### Step 3: Common Issues

#### Issue A: CORS Error
**Symptom**: Error about "CORS policy" or "blocked by CORS"
**Fix**: Backend CORS issue - let me know if you see this

#### Issue B: 401 Unauthorized
**Symptom**: "401 Unauthorized" error
**Fix**: Token expired - try logging out and back in

#### Issue C: Network Error
**Symptom**: "Network Error" or "Failed to fetch"
**Fix**: Backend might not be running properly

#### Issue D: Validation Error
**Symptom**: "400 Bad Request" - message too long or invalid
**Fix**: Check message content

### Step 4: Quick Checks

**Is the message input disabled?**
- Check if the send button is greyed out
- Check if input field is disabled

**Can you type in the message box?**
- Yes → Check console for errors
- No → There's a state issue

**Do you see any toast error messages?**
- Check top of screen for red error toasts

---

## Likely Causes (Based on Recent Changes)

### 1. Pagination Response Format Issue
The backend now returns:
```json
{
  "messages": [...],
  "hasMore": true,
  "cursor": "..."
}
```

But somewhere might still expect just the array.

### 2. XSS Sanitization Too Strict
If you're sending special characters, they might be getting blocked.

### 3. Frontend State Issue
The selected user might not be set properly.

---

## What I Need From You

**Please check your browser console and tell me:**
1. What error message you see (exact text)
2. What's the status code in Network tab
3. Can you type in the message box?
4. Is one specific user affected or all users?

**Then I can give you the exact fix!** 🔧

---

## Quick Test

Try sending these messages and tell me which ones work:
1. Simple text: `hello` - Works? ___
2. With emoji: `hello 👋` - Works? ___
3. Longer text: `This is a longer message to test` - Works? ___
4. With special chars: `Test & test` - Works? ___

This will help me pinpoint the issue!
