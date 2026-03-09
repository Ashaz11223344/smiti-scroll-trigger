import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/all';
import { Play, Pause, RotateCcw } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 1749;
const FRAME_PREFIX = '';
const FRAME_DIGITS = 4;
const FRAME_EXT = '.webp'
const FPS = 30;

const ScrollCanvas: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const autoplayRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const currentFrameRef = useRef<number>(0);
    const isPlayingRef = useRef<boolean>(false);
    const hasInitialRender = useRef<boolean>(false);

    // Keep the ref in sync with state so effects can read the latest value
    // without needing isPlaying in their dependency arrays.
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // Helper to format frame numbers
    const formatFrame = (index: number) => {
        return `${FRAME_PREFIX}${index.toString().padStart(FRAME_DIGITS, '0')}${FRAME_EXT}`;
    };

    // Preload Images
    useEffect(() => {
        const preloadImages = async () => {
            const loadedImages: HTMLImageElement[] = [];
            let loadedCount = 0;

            for (let i = 0; i < TOTAL_FRAMES; i++) {
                const img = new Image();
                img.src = `/frames/${formatFrame(i)}`;
                img.onload = () => {
                    loadedCount++;
                    const newProgress = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
                    setProgress(Math.min(100, newProgress));
                    if (loadedCount === TOTAL_FRAMES) {
                        setIsLoaded(true);
                    }
                };
                img.onerror = () => {
                    console.error(`Failed to load frame: /frames/${formatFrame(i)}`);
                    loadedCount++;
                    const newProgress = Math.floor((loadedCount / TOTAL_FRAMES) * 100);
                    setProgress(Math.min(100, newProgress));
                    if (loadedCount === TOTAL_FRAMES) {
                        setIsLoaded(true);
                    }
                };
                loadedImages.push(img);
            }
            setImages(loadedImages);
        };

        preloadImages();
    }, []);

    const renderFrame = useCallback((index: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context || images.length === 0) return;
        const img = images[index];
        if (!img) return;

        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        const imgWidth = img.width;
        const imgHeight = img.height;

        const ratio = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
        const newWidth = imgWidth * ratio;
        const newHeight = imgHeight * ratio;
        const x = (canvasWidth - newWidth) / 2;
        const y = (canvasHeight - newHeight) / 2;

        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.drawImage(img, x, y, newWidth, newHeight);
        currentFrameRef.current = index;
    }, [images]);

    // Autoplay Loop — reads currentFrameRef to resume from where we left off
    useEffect(() => {
        if (!isPlaying || !isLoaded) {
            if (autoplayRef.current) cancelAnimationFrame(autoplayRef.current);
            return;
        }

        lastFrameTimeRef.current = 0; // Reset timing so first frame fires immediately

        const animate = (time: number) => {
            if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
            const delta = time - lastFrameTimeRef.current;

            if (delta >= 1000 / FPS) {
                lastFrameTimeRef.current = time;

                const nextFrame = currentFrameRef.current + 1;

                if (nextFrame >= TOTAL_FRAMES) {
                    setIsPlaying(false);
                    if (document.fullscreenElement) {
                        document.exitFullscreen().catch(() => { });
                    }
                    return;
                }

                renderFrame(nextFrame);

                // Sync scroll position with frame progress
                if (containerRef.current) {
                    const totalScroll = ScrollTrigger.maxScroll(window);
                    const newScrollPos = (nextFrame / (TOTAL_FRAMES - 1)) * totalScroll;
                    window.scrollTo({ top: newScrollPos, behavior: 'auto' });
                }
            }
            autoplayRef.current = requestAnimationFrame(animate);
        };

        autoplayRef.current = requestAnimationFrame(animate);
        return () => {
            if (autoplayRef.current) cancelAnimationFrame(autoplayRef.current);
        };
    }, [isPlaying, isLoaded, renderFrame]);

    // Handle manual interactions to pause autoplay
    useEffect(() => {
        const pauseOnInteraction = () => {
            if (isPlayingRef.current) setIsPlaying(false);
        };

        window.addEventListener('wheel', pauseOnInteraction, { passive: true });
        window.addEventListener('touchmove', pauseOnInteraction, { passive: true });

        return () => {
            window.removeEventListener('wheel', pauseOnInteraction);
            window.removeEventListener('touchmove', pauseOnInteraction);
        };
    }, []); // No deps — uses ref to read latest isPlaying

    // Scroll-driven animation — this effect does NOT depend on isPlaying.
    // It uses isPlayingRef to check state without re-running.
    useEffect(() => {
        if (!isLoaded || images.length === 0 || !canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            renderFrame(currentFrameRef.current);
        };

        const trigger = ScrollTrigger.create({
            trigger: containerRef.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.1,
            onUpdate: (self) => {
                // Only update from scroll when NOT autoplaying (avoids feedback loop)
                if (!isPlayingRef.current) {
                    const frameIndex = Math.min(
                        TOTAL_FRAMES - 1,
                        Math.floor(self.progress * (TOTAL_FRAMES - 1))
                    );
                    renderFrame(frameIndex);
                }
            },
        });

        // Discrete Wheel Handler
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            setIsPlaying(false);

            const delta = e.deltaY > 0 ? 1 : -1;
            const step = e.shiftKey ? 60 : 1;

            const totalScrollHeight = trigger.end - trigger.start;
            const scrollPerFrame = totalScrollHeight / (TOTAL_FRAMES - 1);

            const newScroll = window.scrollY + (delta * scrollPerFrame * step);

            window.scrollTo({
                top: Math.max(trigger.start, Math.min(trigger.end, newScroll)),
                behavior: 'auto'
            });
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('resize', handleResize);
        handleResize();

        // Only render frame 0 on the very first mount
        if (!hasInitialRender.current) {
            renderFrame(0);
            hasInitialRender.current = true;
        }

        return () => {
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resize', handleResize);
            trigger.kill();
        };
    }, [isLoaded, images, renderFrame]); // NO isPlaying here!

    const togglePlay = async () => {
        if (!isPlaying) {
            try {
                if (!document.fullscreenElement) {
                    await containerRef.current?.requestFullscreen();
                }
            } catch (err) {
                console.error("Fullscreen error:", err);
            }
        }
        setIsPlaying(!isPlaying);
    };

    const handleRestart = () => {
        setIsPlaying(false);
        renderFrame(0);
        window.scrollTo({ top: 0, behavior: 'auto' });
        setTimeout(() => setIsPlaying(true), 100);
    };

    return (
        <div ref={containerRef} className="relative w-full h-full bg-black">
            {!isLoaded && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-500">
                    <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
                        <div
                            className="h-full bg-white transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-white text-sm font-medium tracking-widest uppercase">
                        Loading Experience {progress}%
                    </p>
                </div>
            )}

            <canvas
                ref={canvasRef}
                className="fixed top-0 left-0 w-full h-full object-cover"
            />

            {isLoaded && (
                <div
                    className="fixed bottom-8 right-8 z-50 flex items-center gap-4"
                    onMouseEnter={() => setShowControls(true)}
                    onMouseLeave={() => setShowControls(false)}
                >
                    {(showControls || !isPlaying) && currentFrameRef.current > 0 && (
                        <button
                            onClick={handleRestart}
                            className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all duration-300 group shadow-2xl"
                            aria-label="Restart"
                            title="Restart from beginning"
                        >
                            <RotateCcw className="w-6 h-6 text-white" />
                        </button>
                    )}

                    <button
                        onClick={togglePlay}
                        className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 rounded-full transition-all duration-300 group shadow-2xl"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <Pause className="w-6 h-6 text-white fill-white" />
                        ) : (
                            <div className="flex items-center gap-2 px-1">
                                <Play className="w-6 h-6 text-white fill-white translate-x-0.5" />
                                {currentFrameRef.current > 0 && (
                                    <span className="text-white font-medium text-sm pr-2">Resume</span>
                                )}
                            </div>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ScrollCanvas;
