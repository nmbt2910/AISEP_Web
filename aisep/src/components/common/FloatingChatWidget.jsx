import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MessageCircle, X } from 'lucide-react';
import styles from './FloatingChatWidget.module.css';
import ChatWindow from './ChatWindow';

/**
 * FloatingChatWidget - Floating chat widget in bottom-right corner
 * Uses Portals to ensure it stays in the viewport corner regardless of parent styling
 */
export default function FloatingChatWidget({ 
  chatSessionId,
  displayName = 'Chat',
  handle,
  currentUserId,
  sentTime,
  onClose
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  // Sync state: if a new sessionId is provided, make sure it's open
  useEffect(() => {
    if (chatSessionId) {
      setIsOpen(true);
      setIsClosing(false);
    }
  }, [chatSessionId]);

  // Only show if chatSessionId is provided
  if (!chatSessionId) {
    return null;
  }

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation (200ms matches CSS)
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      if (onClose) {
        onClose();
      }
    }, 200);
  };

  const widgetContent = (
    <>
      {/* Backdrop for mobile or focus - only active if session exists */}
      {isOpen && (
        <div 
          className={`${styles.backdrop} ${isClosing ? styles.closing : ''}`} 
          onClick={handleClose} 
        />
      )}
      
      {isOpen && (
        <div className={`${styles.chatContainer} ${isClosing ? styles.closing : ''}`}>
          <ChatWindow
            chatSessionId={chatSessionId}
            displayName={displayName}
            handle={handle}
            currentUserId={currentUserId}
            sentTime={sentTime}
            onClose={handleClose}
          />
        </div>
      )}
    </>
  );

  // Render into body to bypass parent transforms/overflows
  return createPortal(widgetContent, document.body);
}
