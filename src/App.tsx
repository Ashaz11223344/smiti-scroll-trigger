import React from 'react';
import ScrollCanvas from './components/ScrollCanvas';

function App() {
    return (
        <main className="bg-black">
            <section className="relative h-[21000px]">
                <div className="sticky top-0 h-screen flex flex-col items-center justify-center text-center px-4 z-10 pointer-events-none">

                </div>
                <div className="absolute inset-0">
                    <ScrollCanvas />
                </div>
            </section>

            <section className="min-h-screen flex items-center justify-center bg-white text-black py-20 px-4">
                <div className="max-w-4xl text-center">
                    <h2 className="text-5xl md:text-7xl font-bold mb-8">Unmatched Performance.</h2>
                    <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                        Every frame is pre-rendered and synchronized with your scroll,
                        providing a buttery-smooth 60fps experience that feels completely intuitive.
                    </p>
                </div>
            </section>

            <section className="min-h-screen flex items-center justify-center bg-black text-white py-20 px-4">
                <div className="max-w-4xl text-center">
                    <h2 className="text-5xl md:text-7xl font-bold mb-8 italic">Scroll to Explore.</h2>

                </div>
            </section>
        </main>
    );
}

export default App;
