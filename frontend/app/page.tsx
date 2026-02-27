"use client";

import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import StatsBar from "@/components/StatsBar";
import GameRoverViewer from "@/components/GameRoverViewer";
import TerrainClasses from "@/components/TerrainClasses";
import SegmentationDemo from "@/components/SegmentationDemo";
import Architecture from "@/components/Architecture";
import APIReference from "@/components/APIReference";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="bg-dunenet-dark min-h-screen">
      <Navigation />
      <Hero />
      <StatsBar />
      <section id="rover" className="py-24">
        <GameRoverViewer />
      </section>
      <TerrainClasses />
      <SegmentationDemo />
      <Architecture />
      <APIReference />
      <Footer />
    </main>
  );
}
