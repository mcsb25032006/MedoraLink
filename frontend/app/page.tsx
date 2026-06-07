"use client"

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Heart, Users, DollarSign, Shield, Moon, Sun, ArrowRight, Sparkles, CheckCircle, Pill, Recycle, Handshake, HeartHandshake, TrendingUp } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"

export default function HomePage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [showHeader, setShowHeader] = useState(false)
  const [hoveredChallenge, setHoveredChallenge] = useState<number | null>(null)
  const ctaRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const target = ctaRef.current
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowHeader(!entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className={`glass border-b fixed top-0 left-0 right-0 z-50 transition-transform duration-300 will-change-transform ${showHeader ? "translate-y-0" : "-translate-y-full"}`}>
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Heart className="h-8 w-8 text-primary animate-pulse-subtle" />
              <div className="absolute inset-0 h-8 w-8 text-primary/20 animate-ping" />
            </div>
            <span className="text-2xl font-bold gradient-text">MedoraLink</span>
          </div>
          <div className="flex items-center space-x-4">
            {/* Dark mode toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hover-lift"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            <Link href="/login">
              <Button variant="outline" className="hover-lift hover-glow bg-transparent">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="hover-lift hover-glow">
                Sign Up
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative w-full animate-fade-in-up">
        <div className="relative w-full overflow-hidden">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            src="/landing.mp4"
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative">
            <div className="container mx-auto px-4">
              <div className="max-w-5xl mx-auto text-center py-20">
                

                <div className="inline-flex items-center space-x-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6 animate-scale-in backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            <span>Introducing</span>
          </div>
          <div className="flex items-center justify-center space-x-3 mb-4">
                  <Heart className="h-24 w-24 text-white animate-pulse-subtle" />
                  <span className="text-9xl font-bold text-white">MedoraLink</span>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-6 text-balance gradient-text-hero-brand leading-tight">
            Community-Driven Medicine Access Platform
          </h1>

                <p className="text-l md:text-xl text-white/90 mb-10 text-pretty max-w-3xl mx-auto leading-relaxed">
            Leverage community power to reduce medicine costs, redistribute unused medication responsibly, and provide
            micro-finance support for vulnerable patients.
          </p>

                <div ref={ctaRef} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/auth">
              <Button size="lg" className="px-8 py-4 text-lg hover-lift hover-glow group">
                Get Started Today
                <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
                  <a href="#how-it-works">
            <Button variant="outline" size="lg" className="px-8 py-4 text-lg hover-lift glass-card bg-transparent">
              Learn More
            </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
          </div>

        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 mt-12 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>HIPAA Compliant</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Doctor Verified</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Community Trusted</span>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">The Problem I Solve</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Healthcare costs are rising, but community solutions can make a difference
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Challenges Column */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-bold text-destructive mb-6 flex items-center gap-3">
                <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
                Current Challenges
              </h3>

              {/* Challenge 1 - Expensive Medicine */}
              <motion.div
                className={`group relative p-6 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer ${
                  hoveredChallenge === 0 ? 'scale-105' : ''
                } bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-200/20 hover:border-red-300/40`}
                onHoverStart={() => setHoveredChallenge(0)}
                onHoverEnd={() => setHoveredChallenge(null)}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
                    <Pill className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Expensive Niche Medicines</h4>
                    <p className="text-red-700/80 dark:text-red-200/80">
                      Specialized medications cost thousands, putting them out of reach for most patients
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Challenge 2 - Insurance Gaps */}
              <motion.div
                className={`group relative p-6 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer ${
                  hoveredChallenge === 1 ? 'scale-105' : ''
                } bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-200/20 hover:border-red-300/40`}
                onHoverStart={() => setHoveredChallenge(1)}
                onHoverEnd={() => setHoveredChallenge(null)}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Insurance Coverage Gaps</h4>
                    <p className="text-red-700/80 dark:text-red-200/80">
                      Under-insured patients face devastating out-of-pocket costs for essential treatments
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Challenge 3 - Medicine Waste */}
              <motion.div
                className={`group relative p-6 rounded-2xl shadow-lg transition-all duration-300 cursor-pointer ${
                  hoveredChallenge === 2 ? 'scale-105' : ''
                } bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-200/20 hover:border-red-300/40`}
                onHoverStart={() => setHoveredChallenge(2)}
                onHoverEnd={() => setHoveredChallenge(null)}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-red-100 text-red-600 group-hover:bg-red-200 transition-colors">
                    <Recycle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">Massive Medicine Waste</h4>
                    <p className="text-red-700/80 dark:text-red-200/80">
                      Billions in unused medications are thrown away while others desperately need them
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Solutions Column */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h3 className="text-2xl font-bold text-[#c5a059] mb-6 flex items-center gap-3">
                <div className="w-3 h-3 bg-[#c5a059] rounded-full animate-pulse"></div>
                My Solutions
              </h3>

              {/* Solution 1 - Community Buying */}
              <motion.div
                className={`group relative p-6 rounded-2xl shadow-lg transition-all duration-300 ${
                  hoveredChallenge === 0 ? 'scale-105 ring-2 ring-[#c5a059]/50' : ''
                } bg-gradient-to-br from-[#c5a059]/10 to-teal-500/10 border border-[#c5a059]/20 hover:border-[#c5a059]/40`}
                whileHover={{ scale: 1.02 }}
                animate={hoveredChallenge === 0 ? { scale: 1.05 } : { scale: 1 }}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <motion.div 
                    className="p-3 rounded-full bg-[#c5a059]/20 text-[#c5a059] group-hover:bg-[#c5a059]/30 transition-colors"
                    whileHover={{ rotate: 10 }}
                  >
                    <Handshake className="w-6 h-6" />
                  </motion.div>
                  <div>
                    <h4 className="font-semibold text-[#c5a059] mb-2">Community Bulk Purchasing</h4>
                    <p className="text-[#c5a059]/80">
                      Pool demand to unlock wholesale prices and make expensive medicines affordable
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Solution 2 - Micro Grants */}
              <motion.div
                className={`group relative p-6 rounded-2xl shadow-lg transition-all duration-300 ${
                  hoveredChallenge === 1 ? 'scale-105 ring-2 ring-[#c5a059]/50' : ''
                } bg-gradient-to-br from-[#c5a059]/10 to-teal-500/10 border border-[#c5a059]/20 hover:border-[#c5a059]/40`}
                whileHover={{ scale: 1.02 }}
                animate={hoveredChallenge === 1 ? { scale: 1.05 } : { scale: 1 }}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <motion.div 
                    className="p-3 rounded-full bg-[#c5a059]/20 text-[#c5a059] group-hover:bg-[#c5a059]/30 transition-colors"
                    whileHover={{ rotate: 10 }}
                  >
                    <HeartHandshake className="w-6 h-6" />
                  </motion.div>
                  <div>
                    <h4 className="font-semibold text-[#c5a059] mb-2">Micro-Grants for Vulnerable Patients</h4>
                    <p className="text-[#c5a059]/80">
                      Community-funded assistance to bridge insurance gaps and cover urgent medical needs
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Solution 3 - Medicine Redistribution */}
              <motion.div
                className={`group relative p-6 rounded-2xl shadow-lg transition-all duration-300 ${
                  hoveredChallenge === 2 ? 'scale-105 ring-2 ring-[#c5a059]/50' : ''
                } bg-gradient-to-br from-[#c5a059]/10 to-teal-500/10 border border-[#c5a059]/20 hover:border-[#c5a059]/40`}
                whileHover={{ scale: 1.02 }}
                animate={hoveredChallenge === 2 ? { scale: 1.05 } : { scale: 1 }}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                viewport={{ once: true }}
              >
                <div className="flex items-start gap-4">
                  <motion.div 
                    className="p-3 rounded-full bg-[#c5a059]/20 text-[#c5a059] group-hover:bg-[#c5a059]/30 transition-colors"
                    whileHover={{ rotate: 10 }}
                  >
                    <TrendingUp className="w-6 h-6" />
                  </motion.div>
                  <div>
                    <h4 className="font-semibold text-[#c5a059] mb-2">Safe Medicine Redistribution</h4>
                    <p className="text-[#c5a059]/80">
                      Doctor-verified system to safely redistribute unused medications to those in need
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="container mx-auto px-4 py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">How MedoraLink Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple ways to access affordable healthcare through community support
            </p>
          </div>

          <div className="space-y-16">
            {/* Community Buying - icon left */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2">
                <img
                  src="/community_buying.png"
                  alt="Community Buying"
                  className="w-full h-[300px] md:h-[420px] rounded-3xl shadow-2xl object-cover hover-lift"
                />
              </div>
              <div className="md:w-1/2 text-left">
                <h3 className="font-bold mb-4" style={{ fontSize: "55px" }}>Community Buying</h3>
                <p className="text-lg text-muted-foreground mb-4">
                  MedoraLink changes that: connecting patients to <span className="text-[#c5a059] font-semibold">affordable options</span>, <span className="text-[#c5a059] font-semibold">donated supplies</span>, and <span className="text-[#c5a059] font-semibold">bulk savings</span> without <span className="text-[#c5a059] font-semibold">crushing upfront costs</span>. It may take a little more time, but for those in need, it means <span className="text-[#c5a059] font-semibold">vital medicine</span> at <span className="text-[#c5a059] font-semibold">little to no cost</span> — and <span className="text-[#c5a059] font-semibold">lives saved</span>.
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Pool demand to unlock bulk discounts</li>
                  <li>• Transparent pricing and delivery timelines</li>
                  <li>• Safer access to essential medications</li>
                </ul>
              </div>
                </div>

            {/* Medicine Donation - icon right */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2 md:order-2">
                <img
                  src="/medicine_donation.png"
                  alt="Medicine Donation"
                  className="w-full h-[300px] md:h-[420px] rounded-3xl shadow-2xl object-cover hover-lift"
                />
              </div>
              <div className="md:w-1/2 md:order-1 text-left">
                <h3 className="font-bold mb-4" style={{ fontSize: "55px" }}>Medicine Donation</h3>
                <p className="text-lg text-muted-foreground mb-3">
                  Search for <span className="text-[#c5a059] font-semibold">available donations</span> in your area — or <span className="text-[#c5a059] font-semibold">give your own</span> with just a <span className="text-[#c5a059] font-semibold">quick form</span>.
                </p>
                <p className="text-lg text-muted-foreground mb-4">
                  Every request is <span className="text-[#c5a059] font-semibold">cross-checked for safety</span> and <span className="text-[#c5a059] font-semibold">approved by a doctor</span>, so donated meds <span className="text-[#c5a059] font-semibold">reach the right people</span>, <span className="text-[#c5a059] font-semibold">stress-free</span>.
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Verified eligibility and safety checks</li>
                  <li>• Easy drop-off and pickup options</li>
                  <li>• Impact tracking for transparency</li>
                </ul>
              </div>
                </div>

            {/* Micro Grants - icon left */}
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="md:w-1/2">
                <img
                  src="/micro_grants.png"
                  alt="Micro Grants"
                  className="w-full h-[300px] md:h-[420px] rounded-3xl shadow-2xl object-cover hover-lift"
                />
              </div>
              <div className="md:w-1/2 text-left">
                <h3 className="font-bold mb-4" style={{ fontSize: "55px" }}>Micro Grants</h3>
                <p className="text-lg text-muted-foreground mb-3">
                  Even small costs can feel impossible.
                </p>
                <p className="text-lg text-muted-foreground mb-4">
                  MedoraLink’s micro-grants let patients <span className="text-[#c5a059] font-semibold">request up to $200</span> for <span className="text-[#c5a059] font-semibold">urgent needs</span>, and let others <span className="text-[#c5a059] font-semibold">give with a click</span>. <span className="text-[#c5a059] font-semibold">Simple, fast, and life-changing.</span>
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Quick application and review</li>
                  <li>• Community-funded assistance</li>
                  <li>• Focused on urgent needs</li>
                </ul>
              </div>
                </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center animate-fade-in-up">
          <div className="mx-auto mb-8 p-6 bg-primary/10 rounded-3xl w-fit">
            <Shield className="h-20 w-20 text-primary mx-auto" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">Safe & Verified</h2>
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto">
            All transactions require healthcare provider verification. I ensure medication safety through proper
            documentation and verification processes.
          </p>
          <Link href="/signup">
            <Button size="lg" className="px-10 py-4 text-lg hover-lift hover-glow group">
              Join MedoraLink Today
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="bg-card border-t">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Heart className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold gradient-text">MedoraLink</span>
          </div>
          <p className="text-muted-foreground text-lg mb-6">
            Making healthcare accessible through community collaboration
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Contact Us
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Help Center
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
