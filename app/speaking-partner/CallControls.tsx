import {
  SpeakingWhileMutedNotification,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  ScreenShareButton,
  useCall,
} from '@stream-io/video-react-sdk';
import React from 'react';
import { Phone } from 'lucide-react';

const CustomEndCallButton = () => {
  const call = useCall();

  const handleEndCall = async () => {
    if (call) {
      try {
        await call.leave();
        window.location.href = '/speaking-partner';
      } catch (err) {
        console.error('Failed to leave the call', err);
      }
    }
  };

  return (
    <button onClick={handleEndCall} className="bg-red-500 text-white p-2 rounded-full">
      <Phone size={24} />
    </button>
  );
};

const CustomCallControls = () => {
  return (
    <div className="str-video__call-controls items-center justify-center flex space-x-2">
      <SpeakingWhileMutedNotification>
        <ToggleAudioPublishingButton />
      </SpeakingWhileMutedNotification>
      <ToggleVideoPublishingButton />
      <ScreenShareButton />
      <CustomEndCallButton />
    </div>
  );
};

export default CustomCallControls;
