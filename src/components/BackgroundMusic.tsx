import React, { useEffect, useRef, useState } from 'react';
import { Music, Pause, Play, Volume2, VolumeX } from 'lucide-react';

const BackgroundMusic: React.FC = () => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(0.2); // Default low volume
    const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const targetVolume = 0.2;
    const fadeStep = 0.02;
    const fadeSpeed = 50; // ms

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = 0; // Start at 0 for fade-in
        audio.loop = true;

        // Attempt autoplay
        const startAutoplay = async () => {
            try {
                await audio.play();
                setIsPlaying(true);
                fadeIn();
            } catch (err) {
                console.log("Autoplay blocked by browser. Music will start on user interaction.");
            }
        };

        startAutoplay();

        // Fallback: Start on first interaction if blocked
        const handleFirstInteraction = () => {
            if (!isPlaying) {
                audio.play().then(() => {
                    setIsPlaying(true);
                    fadeIn();
                }).catch(e => console.error("Playback failed:", e));
            }
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('scroll', handleFirstInteraction);
        };

        window.addEventListener('click', handleFirstInteraction);
        window.addEventListener('scroll', handleFirstInteraction);

        return () => {
            window.removeEventListener('click', handleFirstInteraction);
            window.removeEventListener('scroll', handleFirstInteraction);
            if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        };
    }, []);

    const fadeIn = () => {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        const audio = audioRef.current;
        if (!audio) return;

        fadeIntervalRef.current = setInterval(() => {
            if (audio.volume < targetVolume) {
                audio.volume = Math.min(targetVolume, audio.volume + fadeStep);
            } else {
                if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
            }
        }, fadeSpeed);
    };

    const fadeOut = (callback: () => void) => {
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        const audio = audioRef.current;
        if (!audio) return;

        fadeIntervalRef.current = setInterval(() => {
            if (audio.volume > 0) {
                audio.volume = Math.max(0, audio.volume - fadeStep);
            } else {
                if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
                audio.pause();
                callback();
            }
        }, fadeStep * 1000 < fadeSpeed ? fadeSpeed : 30); // Dynamic or fixed
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            fadeOut(() => setIsPlaying(false));
        } else {
            audio.play();
            setIsPlaying(true);
            fadeIn();
        }
    };

    return (
        <div className="fixed bottom-8 left-8 z-[100] flex items-center gap-3">
            <audio ref={audioRef} src="/music.mp3" preload="auto" />

            <button
                onClick={togglePlay}
                className="group relative flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all duration-300 shadow-2xl"
                aria-label={isPlaying ? 'Pause Music' : 'Play Music'}
            >
                {/* Pulse animation when playing */}
                {isPlaying && (
                    <span className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75" />
                )}

                {isPlaying ? (
                    <Pause className="w-5 h-5 text-white fill-white transition-transform group-hover:scale-110" />
                ) : (
                    <Play className="w-5 h-5 text-white fill-white translate-x-0.5 transition-transform group-hover:scale-110" />
                )}
            </button>

            {/* Status Label (Optional but nice) */}
            <div className={`px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full overflow-hidden transition-all duration-500 flex items-center gap-2 ${isPlaying ? 'max-w-xs opacity-100' : 'max-w-0 opacity-0 pointer-events-none'}`}>
                <Music className="w-3 h-3 text-white/60 animate-bounce" />
                <span className="text-[10px] text-white/80 font-medium tracking-widest uppercase whitespace-nowrap">
                    Background Audio Active
                </span>
            </div>
        </div>
    );
};

export default BackgroundMusic;
