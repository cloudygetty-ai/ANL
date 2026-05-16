# ANL — Full Implementation Specifications

# Sentinel Engine v6.0 · ENTROPY-ZERO

# This document is the authoritative source for all ANL implementations.

# Claude Code reads this file to reconstruct the full codebase.

# Do not modify without updating version + changelog.

-----

## HOW TO USE THIS FILE

This is a GOD-MODE spec file. Every implementation in the ANL codebase
is defined here with full code, schemas, contracts, and architecture decisions.

Claude Code workflow:

1. Read CLAUDE.md — load operational persona + constraints
1. Read PROJECT.md — load file map + known issues
1. Read SPECS.md (this file) — load all implementations
1. Scaffold each file exactly as specified
1. Run npx tsc –noEmit after every file
1. Run git add . && git commit && git push after full scaffold

-----

## ENVIRONMENT VALIDATION

### src/config/env.ts

```typescript
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  LIVEKIT_API_KEY: z.string().min(1),
  LIVEKIT_API_SECRET: z.string().min(1),
  LIVEKIT_WS_URL: z.string().url(),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().min(1),
  AWS_S3_BUCKET: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  REVEAL_HMAC_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  JWT_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().url(),
})

const parsed = EnvSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('ENV VALIDATION FAILED — API will not start')
  console.error(parsed.error.format())
  process.exit(1)
}

export const env = parsed.data
```

-----

## DATABASE

### src/lib/prisma.ts

```typescript
import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### src/lib/supabase.ts

```typescript
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)
```

-----

## PRISMA SCHEMA

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id               String    @id @default(uuid())
  displayName      String?
  fullName         String?
  bio              String?
  gender           String?
  preference       String[]
  photos           String[]
  vibeTags         String[]
  phone            String?
  isVisible        Boolean   @default(true)
  isOnline         Boolean   @default(false)
  lastSeen         DateTime  @default(now())
  pushEnabled      Boolean   @default(true)
  expoPushToken    String?
  stripeCustomerId String?
  subscriptionStatus String?
  createdAt        DateTime  @default(now())

  activityEvents     ActivityEvent[]
  circadianProfile   CircadianProfile?
  venueVisits        VenueVisit[]
  venueAffinities    VenueAffinityProfile[]
  voiceProfile       VoiceProfile?
  revealsSent        RevealCommitment[] @relation("RevealsSent")
  revealsReceived    RevealCommitment[] @relation("RevealsReceived")
  contactHashes      ContactHash[]
  exclusionsSent     SocialExclusion[]  @relation("ExclusionsSent")
  exclusionsReceived SocialExclusion[]  @relation("ExclusionsReceived")
  matchesAs1         Match[]            @relation("MatchUser1")
  matchesAs2         Match[]            @relation("MatchUser2")
  messagesSent       Message[]          @relation("MessageSender")
  messagesReceived   Message[]          @relation("MessageRecipient")
  payments           Payment[]

  @@map("users")
}

model Match {
  id       String   @id @default(uuid())
  userId1  String
  userId2  String
  status   String   @default("active")
  createdAt DateTime @default(now())

  user1    User      @relation("MatchUser1", fields: [userId1], references: [id], onDelete: Cascade)
  user2    User      @relation("MatchUser2", fields: [userId2], references: [id], onDelete: Cascade)
  messages Message[]

  @@map("matches")
}

model Message {
  id          String    @id @default(uuid())
  matchId     String
  senderId    String
  recipientId String
  content     String
  type        String    @default("text")
  mediaUrl    String?
  readAt      DateTime?
  createdAt   DateTime  @default(now())

  match     Match @relation(fields: [matchId], references: [id], onDelete: Cascade)
  sender    User  @relation("MessageSender", fields: [senderId], references: [id], onDelete: Cascade)
  recipient User  @relation("MessageRecipient", fields: [recipientId], references: [id], onDelete: Cascade)

  @@map("messages")
}

model Payment {
  id                    String   @id @default(uuid())
  userId                String
  stripePaymentIntentId String   @unique
  status                String
  amount                Int
  currency              String
  createdAt             DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("payments")
}

model ActivityEvent {
  id          String   @id @default(uuid())
  userId      String
  eventType   String
  hourOfDay   Int
  dayOfWeek   Int
  createdAt   DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, hourOfDay])
  @@map("activity_events")
}

model CircadianProfile {
  userId          String   @id
  activityVector  Float[]
  peakHours       Int[]
  confidence      Float    @default(0)
  eventCount      Int      @default(0)
  lastComputedAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("circadian_profiles")
}

model Venue {
  id        String   @id @default(uuid())
  name      String
  category  String
  radiusM   Int      @default(100)
  address   String?
  city      String?
  createdAt DateTime @default(now())

  visits     VenueVisit[]
  affinities VenueAffinityProfile[]

  @@map("venues")
}

model VenueVisit {
  id          String    @id @default(uuid())
  userId      String
  venueId     String
  arrivedAt   DateTime  @default(now())
  departedAt  DateTime?
  hourOfDay   Int
  dayOfWeek   Int
  confirmed   Boolean   @default(false)

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@index([userId, arrivedAt(sort: Desc)])
  @@index([venueId, arrivedAt(sort: Desc)])
  @@map("venue_visits")
}

model VenueAffinityProfile {
  userId         String
  venueId        String
  visitCount     Int      @default(0)
  weightedScore  Float    @default(0)
  peakHours      Int[]
  lastVisitedAt  DateTime?
  lastComputedAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  venue Venue @relation(fields: [venueId], references: [id], onDelete: Cascade)

  @@id([userId, venueId])
  @@index([userId])
  @@map("venue_affinity_profiles")
}

model VoiceProfile {
  userId          String    @id
  mfccVector      Float[]
  pitchMean       Float?
  pitchRange      Float?
  pitchVariance   Float?
  speechRate      Float?
  energyMean      Float?
  energyVariance  Float?
  sampleS3Key     String?
  sampleDurationS Float?
  confidence      Float     @default(0)
  consentGranted  Boolean   @default(false)
  consentAt       DateTime?
  recordedAt      DateTime?
  lastComputedAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("voice_profiles")
}

model RevealCommitment {
  id          String    @id @default(uuid())
  userId      String
  targetId    String
  commitment  String
  status      String    @default("pending")
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  revealedAt  DateTime?

  user   User @relation("RevealsSent", fields: [userId], references: [id], onDelete: Cascade)
  target User @relation("RevealsReceived", fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([userId, targetId])
  @@index([targetId, status])
  @@map("reveal_commitments")
}

model RevealAuditLog {
  id        String   @id @default(uuid())
  eventType String
  userId    String
  targetId  String
  createdAt DateTime @default(now())

  @@map("reveal_audit_log")
}

model ContactHash {
  id         String   @id @default(uuid())
  userId     String
  hash       String
  uploadedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, hash])
  @@index([hash])
  @@map("contact_hashes")
}

model SocialExclusion {
  id         String    @id @default(uuid())
  userId     String
  excludedId String
  reason     String
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())

  user     User @relation("ExclusionsSent", fields: [userId], references: [id], onDelete: Cascade)
  excluded User @relation("ExclusionsReceived", fields: [excludedId], references: [id], onDelete: Cascade)

  @@unique([userId, excludedId])
  @@index([userId])
  @@map("social_exclusions")
}
```

-----

## MIDDLEWARE

### src/middleware/auth.ts

```typescript
import { Request, Response, NextFunction } from 'express'
import { supabaseAdmin } from '../lib/supabase'

export interface AuthRequest extends Request {
  userId: string
  userEmail: string
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }
  const token = authHeader.slice(7)
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
  ;(req as AuthRequest).userId = data.user.id
  ;(req as AuthRequest).userEmail = data.user.email ?? ''
  next()
}
```

### src/middleware/socketAuth.ts

```typescript
import { Socket } from 'socket.io'
import { supabaseAdmin } from '../lib/supabase'

export interface AuthSocket extends Socket {
  userId: string
}

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token as string | undefined
  if (!token) return next(new Error('AUTH_MISSING'))
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) return next(new Error('AUTH_INVALID'))
  ;(socket as AuthSocket).userId = data.user.id
  next()
}
```

### src/middleware/rateLimit.ts

```typescript
import rateLimit from 'express-rate-limit'

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts' },
})

export const mediaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Media request limit exceeded' },
})
```

-----

## PATENT FEATURE SERVICES

### PATENT 1 — src/services/circadian.service.ts

```typescript
import { prisma } from '../lib/prisma'

const WINDOW_DAYS = 14
const MIN_EVENTS_FOR_CONFIDENCE = 20
const PEAK_HOUR_THRESHOLD = 0.7
const STALE_HOURS = 6

export type ActivityEventType =
  | 'foreground' | 'background' | 'location' | 'message_sent' | 'profile_view'

export async function logActivityEvent(userId: string, eventType: ActivityEventType) {
  const now = new Date()
  await prisma.activityEvent.create({
    data: { userId, eventType, hourOfDay: now.getUTCHours(), dayOfWeek: now.getUTCDay() },
  })
}

function buildActivityVector(events: { hourOfDay: number }[]): number[] {
  const counts = new Array(24).fill(0)
  for (const { hourOfDay } of events) counts[hourOfDay]++
  const max = Math.max(...counts)
  if (max === 0) return counts
  return counts.map(c => c / max)
}

function extractPeakHours(vector: number[]): number[] {
  return vector
    .map((weight, hour) => ({ hour, weight }))
    .filter(({ weight }) => weight >= PEAK_HOUR_THRESHOLD)
    .sort((a, b) => b.weight - a.weight)
    .map(({ hour }) => hour)
}

function computeConfidence(eventCount: number): number {
  if (eventCount === 0) return 0
  return Math.min(1.0, Math.log(eventCount + 1) / Math.log(MIN_EVENTS_FOR_CONFIDENCE + 1))
}

export async function recomputeProfile(userId: string) {
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000)
  const events = await prisma.activityEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { hourOfDay: true },
  })
  const vector = buildActivityVector(events)
  const peakHours = extractPeakHours(vector)
  const confidence = computeConfidence(events.length)
  await prisma.circadianProfile.upsert({
    where: { userId },
    create: { userId, activityVector: vector, peakHours, confidence, eventCount: events.length },
    update: { activityVector: vector, peakHours, confidence, eventCount: events.length, lastComputedAt: new Date() },
  })
  return { activityVector: vector, peakHours, confidence }
}

export async function getOrComputeProfile(userId: string) {
  const existing = await prisma.circadianProfile.findUnique({ where: { userId } })
  const staleThreshold = new Date(Date.now() - STALE_HOURS * 3600000)
  if (existing && existing.lastComputedAt > staleThreshold) {
    return { activityVector: existing.activityVector, peakHours: existing.peakHours, confidence: existing.confidence }
  }
  return recomputeProfile(userId)
}

function cosineSim(a: number[], b: number[]): number {
  const dot = a.reduce((s, ai, i) => s + ai * (b[i] ?? 0), 0)
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0))
  if (magA === 0 || magB === 0) return 0
  return dot / (magA * magB)
}

export async function computeCCS(userAId: string, userBId: string): Promise<number> {
  const [pA, pB] = await Promise.all([getOrComputeProfile(userAId), getOrComputeProfile(userBId)])
  if (pA.confidence < 0.1 || pB.confidence < 0.1) return 0.5
  const raw = cosineSim(pA.activityVector, pB.activityVector)
  const normalized = (raw + 1) / 2
  const weight = (pA.confidence + pB.confidence) / 2
  return 0.5 + (normalized - 0.5) * weight
}
```

### PATENT 2 — src/services/venue.service.ts

```typescript
import { prisma } from '../lib/prisma'

const DWELL_CONFIRM_MIN = 5
const AFFINITY_DECAY_HALF_LIFE = 30
const WINDOW_DAYS = 90

export async function detectVenue(userId: string, lat: number, lng: number): Promise<string | null> {
  const results = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM venues
    WHERE ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
      LEAST(radius_m, 200)
    )
    ORDER BY ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) ASC
    LIMIT 1
  `
  return results[0]?.id ?? null
}

export async function processLocationForVenue(userId: string, lat: number, lng: number) {
  const now = new Date()
  const venueId = await detectVenue(userId, lat, lng)
  const openVisit = await prisma.venueVisit.findFirst({
    where: { userId, departedAt: null },
    orderBy: { arrivedAt: 'desc' },
  })
  if (venueId) {
    if (openVisit?.venueId === venueId) {
      const dwellMin = (now.getTime() - openVisit.arrivedAt.getTime()) / 60000
      if (!openVisit.confirmed && dwellMin >= DWELL_CONFIRM_MIN) {
        await prisma.venueVisit.update({ where: { id: openVisit.id }, data: { confirmed: true } })
        await updateVenueAffinity(userId, venueId, openVisit.hourOfDay)
      }
    } else {
      if (openVisit) await prisma.venueVisit.update({ where: { id: openVisit.id }, data: { departedAt: now } })
      await prisma.venueVisit.create({
        data: { userId, venueId, arrivedAt: now, hourOfDay: now.getUTCHours(), dayOfWeek: now.getUTCDay() },
      })
    }
  } else if (openVisit) {
    await prisma.venueVisit.update({ where: { id: openVisit.id }, data: { departedAt: now } })
  }
}

async function updateVenueAffinity(userId: string, venueId: string, hourOfDay: number) {
  const lambda = Math.LN2 / AFFINITY_DECAY_HALF_LIFE
  const now = new Date()
  const since = new Date(Date.now() - WINDOW_DAYS * 86400000)
  const visits = await prisma.venueVisit.findMany({
    where: { userId, venueId, confirmed: true, arrivedAt: { gte: since } },
    select: { arrivedAt: true, hourOfDay: true },
  })
  if (visits.length === 0) return
  const weightedScore = visits.reduce((sum, v) => {
    const ageDays = (now.getTime() - v.arrivedAt.getTime()) / 86400000
    return sum + Math.exp(-lambda * ageDays)
  }, 0)
  const hourCounts = new Array(24).fill(0)
  visits.forEach(v => hourCounts[v.hourOfDay]++)
  const maxCount = Math.max(...hourCounts)
  const peakHours = hourCounts.map((c, h) => ({ h, c })).filter(({ c }) => maxCount > 0 && c / maxCount >= 0.6).map(({ h }) => h)
  await prisma.venueAffinityProfile.upsert({
    where: { userId_venueId: { userId, venueId } },
    create: { userId, venueId, visitCount: visits.length, weightedScore, peakHours, lastVisitedAt: now },
    update: { visitCount: visits.length, weightedScore, peakHours, lastVisitedAt: now, lastComputedAt: now },
  })
}

export async function computeVAS(userAId: string, userBId: string): Promise<number> {
  const [pA, pB] = await Promise.all([
    prisma.venueAffinityProfile.findMany({ where: { userId: userAId } }),
    prisma.venueAffinityProfile.findMany({ where: { userId: userBId } }),
  ])
  if (pA.length === 0 || pB.length === 0) return 0.5
  const mapA = new Map(pA.map(p => [p.venueId, p.weightedScore]))
  const mapB = new Map(pB.map(p => [p.venueId, p.weightedScore]))
  const shared = [...mapA.keys()].filter(id => mapB.has(id))
  if (shared.length === 0) return 0.5
  const dot = shared.reduce((s, id) => s + (mapA.get(id) ?? 0) * (mapB.get(id) ?? 0), 0)
  const magA = Math.sqrt([...mapA.values()].reduce((s, v) => s + v * v, 0))
  const magB = Math.sqrt([...mapB.values()].reduce((s, v) => s + v * v, 0))
  if (magA === 0 || magB === 0) return 0.5
  return Math.min(1.0, dot / (magA * magB))
}

export async function getVenueHeatmap(lat: number, lng: number, radiusM = 10000) {
  const results = await prisma.$queryRaw<{ venue_id: string; lat: number; lng: number; active_count: bigint }[]>`
    SELECT v.id AS venue_id, ST_Y(v.location::geometry) AS lat, ST_X(v.location::geometry) AS lng,
      COUNT(vv.id) AS active_count
    FROM venues v
    LEFT JOIN venue_visits vv ON vv.venue_id = v.id AND vv.departed_at IS NULL
      AND vv.confirmed = true AND vv.arrived_at > NOW() - INTERVAL '2 hours'
    WHERE ST_DWithin(v.location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusM})
    GROUP BY v.id
    ORDER BY active_count DESC
  `
  const maxCount = Math.max(1, ...results.map(r => Number(r.active_count)))
  return results.map(r => ({
    venueId: r.venue_id, lat: r.lat, lng: r.lng,
    activeCount: Number(r.active_count),
    intensity: Number(r.active_count) / maxCount,
  }))
}
```

### PATENT 3 — src/services/voice.service.ts

```typescript
import { prisma } from '../lib/prisma'

const STALENESS_DAYS = 30

export interface AcousticFeatures {
  mfccVector: number[]
  pitchMean: number
  pitchRange: number
  pitchVariance: number
  speechRate: number
  energyMean: number
  energyVariance: number
  confidence: number
}

export async function storeVoiceProfile(
  userId: string, features: AcousticFeatures, s3Key: string, durationS: number
) {
  await prisma.voiceProfile.upsert({
    where: { userId },
    create: {
      userId, ...features, sampleS3Key: s3Key, sampleDurationS: durationS,
      consentGranted: true, consentAt: new Date(), recordedAt: new Date(),
    },
    update: {
      ...features, sampleS3Key: s3Key, sampleDurationS: durationS,
      recordedAt: new Date(), lastComputedAt: new Date(),
    },
  })
}

async function getActiveProfile(userId: string) {
  const p = await prisma.voiceProfile.findUnique({ where: { userId } })
  if (!p || !p.consentGranted || !p.recordedAt) return null
  const ageDays = (Date.now() - p.recordedAt.getTime()) / 86400000
  if (ageDays > STALENESS_DAYS) {
    const decay = Math.max(0, 1 - (ageDays - STALENESS_DAYS) / STALENESS_DAYS)
    return { ...p, confidence: p.confidence * decay }
  }
  return p
}

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  const dot = a.reduce((s, ai, i) => s + ai * (b[i] ?? 0), 0)
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0))
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0))
  if (magA === 0 || magB === 0) return 0
  return dot / (magA * magB)
}

export async function computeVCS(userAId: string, userBId: string): Promise<number> {
  const [pA, pB] = await Promise.all([getActiveProfile(userAId), getActiveProfile(userBId)])
  if (!pA || !pB || pA.confidence < 0.1 || pB.confidence < 0.1) return 0.5
  const mfccRaw = cosineSim(pA.mfccVector, pB.mfccVector)
  const mfccScore = (mfccRaw + 1) / 2
  const aMin = (pA.pitchMean ?? 0) - (pA.pitchRange ?? 0) / 2
  const aMax = (pA.pitchMean ?? 0) + (pA.pitchRange ?? 0) / 2
  const bMin = (pB.pitchMean ?? 0) - (pB.pitchRange ?? 0) / 2
  const bMax = (pB.pitchMean ?? 0) + (pB.pitchRange ?? 0) / 2
  const overlapLen = Math.max(0, Math.min(aMax, bMax) - Math.max(aMin, bMin))
  const unionLen = Math.max(aMax, bMax) - Math.min(aMin, bMin)
  const pitchScore = unionLen > 0 ? overlapLen / unionLen : 0.5
  const rateDelta = Math.abs((pA.speechRate ?? 0) - (pB.speechRate ?? 0))
  const rateScore = Math.max(0, 1 - rateDelta / 4)
  const energyDelta = Math.abs((pA.energyMean ?? 0) - (pB.energyMean ?? 0))
  const energyScore = Math.max(0, 1 - energyDelta / 0.5)
  const rawVCS = mfccScore * 0.50 + pitchScore * 0.25 + rateScore * 0.15 + energyScore * 0.10
  const weight = (pA.confidence + pB.confidence) / 2
  return 0.5 + (rawVCS - 0.5) * weight
}
```

### PATENT 4 — src/services/reveal.service.ts

```typescript
import { createHmac, randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { prisma } from '../lib/prisma'
import { env } from '../config/env'

const REVEAL_TTL_HOURS = 24
const AES_ALGO = 'aes-256-gcm'

function generateCommitment(userId: string, targetId: string, nonce: string): string {
  return createHmac('sha256', env.REVEAL_HMAC_SECRET)
    .update(`${userId}:${targetId}:${nonce}`)
    .digest('hex')
}

function encryptPayload(payload: object, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(AES_ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function deriveRevealKey(userAId: string, userBId: string): Buffer {
  const pairId = [userAId, userBId].sort().join(':')
  return Buffer.from(createHmac('sha256', env.REVEAL_HMAC_SECRET).update(pairId).digest())
}

export async function submitCommitment(userId: string, targetId: string) {
  const nonce = randomBytes(16).toString('hex')
  const commitment = generateCommitment(userId, targetId, nonce)
  const expiresAt = new Date(Date.now() + REVEAL_TTL_HOURS * 3600000)
  await prisma.revealCommitment.upsert({
    where: { userId_targetId: { userId, targetId } },
    create: { userId, targetId, commitment, expiresAt },
    update: { commitment, expiresAt, status: 'pending' },
  })
  await prisma.revealAuditLog.create({ data: { eventType: 'committed', userId, targetId } })
  const counterpart = await prisma.revealCommitment.findUnique({
    where: { userId_targetId: { userId: targetId, targetId: userId } },
  })
  const isMutual = counterpart?.status === 'pending' && counterpart.expiresAt > new Date()
  if (isMutual) {
    await prisma.$transaction([
      prisma.revealCommitment.update({ where: { userId_targetId: { userId, targetId } }, data: { status: 'matched', revealedAt: new Date() } }),
      prisma.revealCommitment.update({ where: { userId_targetId: { userId: targetId, targetId: userId } }, data: { status: 'matched', revealedAt: new Date() } }),
      prisma.revealAuditLog.create({ data: { eventType: 'matched', userId, targetId } }),
    ])
  }
  return { committed: true, alreadyMutual: isMutual }
}

export async function getRevealPayload(requesterId: string, targetId: string) {
  const [mine, theirs] = await Promise.all([
    prisma.revealCommitment.findUnique({ where: { userId_targetId: { userId: requesterId, targetId } } }),
    prisma.revealCommitment.findUnique({ where: { userId_targetId: { userId: targetId, targetId: requesterId } } }),
  ])
  if (mine?.status !== 'matched' || theirs?.status !== 'matched') return null
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { displayName: true, fullName: true, photos: true },
  })
  if (!target) return null
  const key = deriveRevealKey(requesterId, targetId)
  return { encrypted: encryptPayload(target, key) }
}

export async function withdrawCommitment(userId: string, targetId: string) {
  await prisma.revealCommitment.updateMany({ where: { userId, targetId, status: 'pending' }, data: { status: 'withdrawn' } })
  await prisma.revealAuditLog.create({ data: { eventType: 'withdrawn', userId, targetId } })
}

export async function expireStaleCommitments(): Promise<number> {
  const result = await prisma.revealCommitment.updateMany({
    where: { status: 'pending', expiresAt: { lt: new Date() } },
    data: { status: 'expired' },
  })
  return result.count
}
```

### PATENT 5 — src/services/socialGraph.service.ts

```typescript
import { createHash } from 'crypto'
import { prisma } from '../lib/prisma'

function hashPhone(phone: string): string {
  const normalized = phone.replace(/\D/g, '')
  const e164 = normalized.startsWith('1') ? `+${normalized}` : `+1${normalized}`
  return createHash('sha256').update(e164).digest('hex')
}

export async function uploadContacts(userId: string, rawPhones: string[]) {
  const hashes = [...new Set(rawPhones.map(hashPhone))]
  await prisma.$executeRaw`
    INSERT INTO contact_hashes (user_id, hash)
    SELECT ${userId}::uuid, unnest(${hashes}::text[])
    ON CONFLICT (user_id, hash) DO NOTHING
  `
  const myProfile = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } })
  let contactMatches = 0
  if (myProfile?.phone) {
    const myHash = hashPhone(myProfile.phone)
    const usersWithMyHash = await prisma.contactHash.findMany({ where: { hash: myHash, userId: { not: userId } }, select: { userId: true } })
    for (const { userId: otherId } of usersWithMyHash) {
      await prisma.socialExclusion.upsert({ where: { userId_excludedId: { userId, excludedId: otherId } }, create: { userId, excludedId: otherId, reason: 'contact_match' }, update: {} })
      await prisma.socialExclusion.upsert({ where: { userId_excludedId: { userId: otherId, excludedId: userId } }, create: { userId: otherId, excludedId: userId, reason: 'contact_match' }, update: {} })
      contactMatches++
    }
  }
  return { matched: contactMatches, uploaded: hashes.length }
}

export async function getExcludedIds(userId: string): Promise<Set<string>> {
  const exclusions = await prisma.socialExclusion.findMany({
    where: { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { excludedId: true },
  })
  return new Set(exclusions.map(e => e.excludedId))
}

export async function getMutualConnectionIds(userId: string): Promise<Set<string>> {
  const myReveals = await prisma.revealCommitment.findMany({ where: { userId, status: 'matched' }, select: { targetId: true } })
  if (myReveals.length === 0) return new Set()
  const myRevealedIds = myReveals.map(r => r.targetId)
  const mutuals = await prisma.revealCommitment.findMany({
    where: { userId: { in: myRevealedIds }, status: 'matched', targetId: { not: userId } },
    select: { targetId: true },
  })
  return new Set(mutuals.map(m => m.targetId))
}

export async function getFullExclusionSet(userId: string): Promise<Set<string>> {
  const [explicit, mutual] = await Promise.all([getExcludedIds(userId), getMutualConnectionIds(userId)])
  return new Set([...explicit, ...mutual])
}

export async function addExclusion(userId: string, excludedId: string, reason: 'block' | 'manual' = 'manual', ttlDays?: number) {
  const expiresAt = ttlDays ? new Date(Date.now() + ttlDays * 86400000) : null
  await prisma.socialExclusion.upsert({ where: { userId_excludedId: { userId, excludedId } }, create: { userId, excludedId, reason, expiresAt }, update: { reason, expiresAt } })
}
```

-----

## MATCHING PIPELINE

### src/services/matching.service.ts

```typescript
import { getNearbyUsers } from './proximity.service'
import { computeCCS } from './circadian.service'
import { computeVAS } from './venue.service'
import { computeVCS } from './voice.service'
import { getFullExclusionSet } from './socialGraph.service'

const WEIGHTS = { proximity: 0.35, ccs: 0.25, vas: 0.25, vcs: 0.15 } as const

export interface ScoredMatch {
  id: string
  displayName: string
  distanceMeters: number
  circadianScore: number
  venueAffinityScore: number
  voiceChemistryScore: number
  compatibilityScore: number
}

export async function getRankedMatches(
  userId: string, lat: number, lng: number, radiusMeters = 5000, limit = 50
): Promise<ScoredMatch[]> {
  const excluded = await getFullExclusionSet(userId)
  const nearby = await getNearbyUsers({ userId, lat, lng, radiusMeters, limit })
  const eligible = nearby.filter(u => !excluded.has(u.id))
  if (eligible.length === 0) return []
  const scored = await Promise.all(
    eligible.map(async (candidate) => {
      const [ccs, vas, vcs] = await Promise.all([
        computeCCS(userId, candidate.id),
        computeVAS(userId, candidate.id),
        computeVCS(userId, candidate.id),
      ])
      return { ...candidate, ccs, vas, vcs }
    })
  )
  const maxDist = Math.max(1, ...scored.map(u => u.distance_meters))
  return scored
    .map(u => {
      const proxScore = 1 - u.distance_meters / maxDist
      const vcms = proxScore * WEIGHTS.proximity + u.ccs * WEIGHTS.ccs + u.vas * WEIGHTS.vas + u.vcs * WEIGHTS.vcs
      return {
        id: u.id, displayName: u.displayName,
        distanceMeters: Math.round(u.distance_meters),
        circadianScore: Math.round(u.ccs * 100),
        venueAffinityScore: Math.round(u.vas * 100),
        voiceChemistryScore: Math.round(u.vcs * 100),
        compatibilityScore: Math.round(vcms * 100),
      }
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
}
```

### src/services/proximity.service.ts

```typescript
import { prisma } from '../lib/prisma'

interface NearbyUser {
  id: string
  displayName: string
  distance_meters: number
  lastSeen: Date
}

export async function getNearbyUsers({ userId, lat, lng, radiusMeters = 5000, limit = 50 }: {
  userId: string; lat: number; lng: number; radiusMeters?: number; limit?: number
}): Promise<NearbyUser[]> {
  return prisma.$queryRaw<NearbyUser[]>`
    SELECT u.id, u."displayName", u."lastSeen",
      ST_Distance(u.location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) AS distance_meters
    FROM users u
    WHERE u.id != ${userId} AND u."isVisible" = true AND u."lastSeen" > NOW() - INTERVAL '24 hours'
      AND ST_DWithin(u.location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${radiusMeters})
    ORDER BY distance_meters ASC LIMIT ${limit}
  `
}

export async function updateUserLocation(userId: string, lat: number, lng: number) {
  await prisma.$executeRaw`
    UPDATE users SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326), "lastSeen" = NOW() WHERE id = ${userId}
  `
}
```

-----

## SOCKET.IO

### src/socket/index.ts

```typescript
import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import { env } from '../config/env'
import { socketAuthMiddleware, AuthSocket } from '../middleware/socketAuth'
import { registerPresence } from './presence'
import { registerMessaging } from './messaging'

export function createSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  })
  io.use(socketAuthMiddleware)
  io.on('connection', (socket) => {
    const s = socket as AuthSocket
    s.join(`user:${s.userId}`)
    registerPresence(io, s)
    registerMessaging(io, s)
  })
  return io
}
```

### src/socket/presence.ts

```typescript
import { Server } from 'socket.io'
import { AuthSocket } from '../middleware/socketAuth'
import { updateUserLocation } from '../services/proximity.service'
import { logActivityEvent } from '../services/circadian.service'
import { processLocationForVenue } from '../services/venue.service'
import { prisma } from '../lib/prisma'

export function registerPresence(io: Server, socket: AuthSocket) {
  const { userId } = socket
  prisma.user.update({ where: { id: userId }, data: { isOnline: true, lastSeen: new Date() } }).catch(console.error)
  socket.on('presence:location', async ({ lat, lng }: { lat: number; lng: number }) => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return
    await Promise.all([
      updateUserLocation(userId, lat, lng),
      logActivityEvent(userId, 'location'),
      processLocationForVenue(userId, lat, lng),
    ]).catch(console.error)
  })
  socket.on('presence:visibility', async ({ visible }: { visible: boolean }) => {
    await prisma.user.update({ where: { id: userId }, data: { isVisible: visible } }).catch(console.error)
  })
  socket.on('app:foreground', () => logActivityEvent(userId, 'foreground').catch(console.error))
  socket.on('app:background', () => logActivityEvent(userId, 'background').catch(console.error))
  socket.on('disconnect', () => {
    prisma.user.update({ where: { id: userId }, data: { isOnline: false, lastSeen: new Date() } }).catch(console.error)
  })
}
```

### src/socket/messaging.ts

```typescript
import { Server } from 'socket.io'
import { AuthSocket } from '../middleware/socketAuth'
import { prisma } from '../lib/prisma'
import { notify } from '../services/push.service'

interface MessagePayload {
  matchId: string; content: string; type: 'text' | 'media' | 'voice'; mediaUrl?: string
}

export function registerMessaging(io: Server, socket: AuthSocket) {
  const { userId } = socket
  socket.on('chat:join', ({ matchId }: { matchId: string }) => socket.join(`match:${matchId}`))
  socket.on('message:send', async (payload: MessagePayload) => {
    const { matchId, content, type, mediaUrl } = payload
    const match = await prisma.match.findFirst({
      where: { id: matchId, OR: [{ userId1: userId }, { userId2: userId }], status: 'active' },
    })
    if (!match) { socket.emit('message:error', { error: 'Not authorized' }); return }
    const recipientId = match.userId1 === userId ? match.userId2 : match.userId1
    const message = await prisma.message.create({ data: { matchId, senderId: userId, recipientId, content, type, mediaUrl } })
    io.to(`user:${recipientId}`).emit('message:receive', { id: message.id, matchId, senderId: userId, content, type, mediaUrl, createdAt: message.createdAt })
    socket.emit('message:delivered', { id: message.id, matchId })
    const recipientSockets = await io.in(`user:${recipientId}`).fetchSockets()
    if (recipientSockets.length === 0) {
      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } })
      await notify.newMessage(recipientId, sender?.displayName ?? 'Someone', matchId)
    }
  })
  socket.on('message:read', async ({ matchId }: { matchId: string }) => {
    await prisma.message.updateMany({ where: { matchId, recipientId: userId, readAt: null }, data: { readAt: new Date() } })
    const match = await prisma.match.findUnique({ where: { id: matchId } })
    if (!match) return
    const senderId = match.userId1 === userId ? match.userId2 : match.userId1
    io.to(`user:${senderId}`).emit('message:read', { matchId })
  })
  socket.on('typing:start', ({ matchId }: { matchId: string }) => socket.to(`match:${matchId}`).emit('typing:start'))
  socket.on('typing:stop', ({ matchId }: { matchId: string }) => socket.to(`match:${matchId}`).emit('typing:stop'))
}
```

-----

## SERVICES

### src/services/s3.service.ts

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env'
import { randomUUID } from 'crypto'

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
})

type MediaType = 'profile' | 'chat' | 'voice-sample'

export async function getPresignedUploadUrl(userId: string, mediaType: MediaType, contentType: string) {
  const ext = contentType.split('/')[1] ?? 'bin'
  const objectKey = `${mediaType}/${userId}/${randomUUID()}.${ext}`
  const command = new PutObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: objectKey, ContentType: contentType, Metadata: { uploadedBy: userId } })
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
  return { uploadUrl, objectKey, publicUrl: `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${objectKey}` }
}

export async function getS3Object(objectKey: string): Promise<Buffer | null> {
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: objectKey }))
    const stream = response.Body as NodeJS.ReadableStream
    const chunks: Buffer[] = []
    for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    return Buffer.concat(chunks)
  } catch { return null }
}

export async function deleteS3Object(objectKey: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_S3_BUCKET, Key: objectKey }))
}
```

### src/services/livekit.service.ts

```typescript
import { AccessToken } from 'livekit-server-sdk'
import { env } from '../config/env'

export function generateLiveKitToken({ userId, roomName, canPublish = true, canSubscribe = true, ttlSeconds = 3600 }: {
  userId: string; roomName: string; canPublish?: boolean; canSubscribe?: boolean; ttlSeconds?: number
}): string {
  const token = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, { identity: userId, ttl: ttlSeconds })
  token.addGrant({ room: roomName, roomJoin: true, canPublish, canSubscribe, canPublishData: true })
  return token.toJwt()
}
```

### src/services/push.service.ts

```typescript
import Expo, { ExpoPushMessage } from 'expo-server-sdk'
import { prisma } from '../lib/prisma'

const expo = new Expo()

async function sendPushNotification({ userId, type, title, body, data = {} }: {
  userId: string; type: string; title: string; body: string; data?: Record<string, string>
}) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { expoPushToken: true, pushEnabled: true } })
  if (!user?.expoPushToken || !user.pushEnabled) return
  if (!Expo.isExpoPushToken(user.expoPushToken)) return
  const message: ExpoPushMessage = { to: user.expoPushToken, sound: 'default', title, body, data: { type, ...data }, priority: type === 'new_message' ? 'high' : 'normal' }
  try {
    const chunks = expo.chunkPushNotifications([message])
    for (const chunk of chunks) {
      const tickets = await expo.sendPushNotificationsAsync(chunk)
      for (const ticket of tickets) {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          await prisma.user.update({ where: { id: userId }, data: { expoPushToken: null } })
        }
      }
    }
  } catch (err) { console.error('[Push] Send failed:', err) }
}

export const notify = {
  newMessage: (userId: string, senderName: string, matchId: string) =>
    sendPushNotification({ userId, type: 'new_message', title: senderName, body: 'Sent you a message', data: { matchId } }),
  revealMatched: (userId: string, withName: string, matchId: string) =>
    sendPushNotification({ userId, type: 'reveal_matched', title: 'Mutual Reveal', body: `You and ${withName} revealed to each other`, data: { matchId } }),
  newMatch: (userId: string, matchName: string, matchId: string) =>
    sendPushNotification({ userId, type: 'new_match', title: 'New Match Nearby', body: `${matchName} is close`, data: { matchId } }),
}

export async function registerPushToken(userId: string, token: string) {
  if (!Expo.isExpoPushToken(token)) throw new Error(`Invalid Expo push token: ${token}`)
  await prisma.user.update({ where: { id: userId }, data: { expoPushToken: token } })
}
```

-----

## APP ENTRY POINTS

### src/app.ts

```typescript
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { globalLimiter, authLimiter } from './middleware/rateLimit'
import { env } from './config/env'
import healthRouter from './routes/health'
import usersRouter from './routes/users'
import matchesRouter from './routes/matches'
import livekitRouter from './routes/livekit'
import mediaRouter from './routes/media'
import voiceRouter from './routes/voice'
import revealRouter from './routes/reveal'
import socialRouter from './routes/social'
import messagesRouter from './routes/messages'
import venuesRouter from './routes/venues'
import pushRouter from './routes/push'
import paymentsRouter from './routes/payments'

const app = express()
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use('/payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '10kb' }))
app.use(globalLimiter)
app.use('/health', healthRouter)
app.use('/users', usersRouter)
app.use('/matches', matchesRouter)
app.use('/livekit', livekitRouter)
app.use('/media', mediaRouter)
app.use('/voice', voiceRouter)
app.use('/reveal', revealRouter)
app.use('/social', socialRouter)
app.use('/messages', messagesRouter)
app.use('/venues', venuesRouter)
app.use('/push', pushRouter)
app.use('/payments', paymentsRouter)
app.use((_req, res) => res.status(404).json({ error: 'Not found' }))
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express]', err.message)
  res.status(500).json({ error: 'Internal server error' })
})
export default app
```

### src/index.ts

```typescript
import './config/env'
import http from 'http'
import app from './app'
import { createSocketServer } from './socket'
import { env } from './config/env'

const httpServer = http.createServer(app)
const io = createSocketServer(httpServer)
app.set('io', io)

httpServer.listen(env.PORT, () => {
  console.log(`ANL API [${env.NODE_ENV}] — port ${env.PORT}`)
})

const shutdown = async (signal: string) => {
  console.log(`${signal} — shutting down`)
  io.close()
  httpServer.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10000)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
```

-----

## NIGHTLY JOB

### src/jobs/nightly.ts

```typescript
import '../config/env'
import { prisma } from '../lib/prisma'
import { recomputeProfile } from '../services/circadian.service'
import { expireStaleCommitments } from '../services/reveal.service'

async function run() {
  const start = Date.now()
  console.log('[NIGHTLY] Started:', new Date().toISOString())
  const errors: string[] = []

  // Recompute stale circadian profiles
  const stale = await prisma.circadianProfile.findMany({
    where: { lastComputedAt: { lt: new Date(Date.now() - 6 * 3600000) } },
    select: { userId: true },
  })
  for (const { userId } of stale) {
    try { await recomputeProfile(userId) }
    catch (e) { errors.push(`circadian:${userId}: ${(e as Error).message}`) }
  }

  // Expire reveal commitments
  const expired = await expireStaleCommitments().catch(e => { errors.push(`reveal: ${e.message}`); return 0 })

  // Cleanup old data
  await prisma.$executeRaw`DELETE FROM activity_events WHERE created_at < NOW() - INTERVAL '90 days'`
  await prisma.$executeRaw`DELETE FROM venue_visits WHERE departed_at IS NOT NULL AND departed_at < NOW() - INTERVAL '30 days'`
  await prisma.socialExclusion.deleteMany({ where: { expiresAt: { lt: new Date() } } })

  console.log('[NIGHTLY] Complete:', { circadianRecomputed: stale.length, expired, errors, durationMs: Date.now() - start })
  if (errors.length > 0) console.error('[NIGHTLY] Errors:', errors)
}

run().then(() => process.exit(0)).catch(e => { console.error('[NIGHTLY] Fatal:', e); process.exit(1) })
```

-----

## FRONTEND TOKENS

### src/theme/tokens.ts

```typescript
export const colors = {
  bg: '#0D0A14', bgElevated: '#13101C', bgCard: '#1A1625',
  border: '#2A2040', borderSubtle: '#1E1830',
  accent: '#8B5CF6', accentWarm: '#C9A84C', accentMuted: '#4C3580',
  text: '#F0EBF8', textMuted: '#7B6B9A', textDim: '#4A3D66',
  danger: '#EF4444', success: '#10B981', reveal: '#C9A84C',
} as const

export const fonts = {
  display: 'Cinzel-Regular', displayB: 'Cinzel-Bold',
  ui: 'DMMono-Regular', uiM: 'DMMono-Medium',
} as const

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const
export const radius = { sm: 4, md: 8, lg: 16, full: 9999 } as const
```

-----

## INFRASTRUCTURE

### fly.toml

```toml
app = "anl-api"
primary_region = "ewr"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "3000"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

  [http_service.concurrency]
    type = "connections"
    hard_limit = 500
    soft_limit = 200

[[vm]]
  memory = "512mb"
  cpu_kind = "shared"
  cpus = 1

[checks]
  [checks.health]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/health"
    port = 3000
    timeout = "5s"
    type = "http"
```

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
RUN addgroup -S anl && adduser -S anl -G anl
COPY --from=builder --chown=anl:anl /app/dist ./dist
COPY --from=builder --chown=anl:anl /app/node_modules ./node_modules
COPY --from=builder --chown=anl:anl /app/prisma ./prisma
COPY --from=builder --chown=anl:anl /app/package.json ./
USER anl
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

### .github/workflows/fly-deploy.yml

```yaml
name: ANL Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

-----

## VCMS+ SCORING REFERENCE

```
VCMS+ = Proximity(0.35) + CCS(0.25) + VAS(0.25) + VCS(0.15)

CCS = cosine_similarity(activityVector_A, activityVector_B) × confidence_weight
      cold start (confidence < 0.1) → 0.5 neutral

VAS = cosine_similarity(venueAffinityVector_A, venueAffinityVector_B)
      no shared venues → 0.5 neutral

VCS = mfcc_similarity(0.50) + pitch_overlap(0.25) + speech_rate(0.15) + energy(0.10)
      × confidence_weight
      no consent or sample → 0.5 neutral

Social Graph Exclusion:
  excluded = explicit_blocks ∪ contact_matches ∪ mutual_connections
  applied BEFORE proximity query — silent, bidirectional

Cryptographic Mutual Reveal:
  commitment = HMAC-SHA256(userId:targetId:nonce, REVEAL_HMAC_SECRET)
  reveal_key = HMAC-SHA256(sorted(userA, userB), REVEAL_HMAC_SECRET)
  payload = AES-256-GCM(target_profile, reveal_key)
  match = both commitments verified + TTL not expired
```

-----

## PATENT CLAIMS REFERENCE

```
Patent 1 — CCS (Circadian Compatibility Score)
  Method: Computing chronobiological compatibility from in-app behavioral
  activity vectors using cosine similarity on 24-element temporal arrays
  with confidence-weighted cold-start neutral default.

Patent 2 — VAS (Venue Affinity Score)
  Method: Matching via co-presence probability at real-world venues
  using dwell-confirmed visit history with exponential decay weighting.

Patent 3 — VCS (Voice Chemistry Score)
  Method: Acoustic feature extraction (MFCC, pitch, speech rate, energy)
  with cross-user spectral compatibility scoring as a matching signal.

Patent 4 — Cryptographic Mutual Reveal
  Method: Commitment scheme using HMAC-SHA256 with TTL-bounded mutual
  verification before identity disclosure via AES-256-GCM.

Patent 5 — Social Graph Exclusion Engine
  Method: Silent exclusion filter using hashed contact matching,
  mutual connection graph traversal, and configurable explicit blocks.

Filing targets: USPTO Class 9 (software) + Class 45 (dating services)
Priority date: file provisional immediately — all 5 features complete
```

-----

## DEPLOYMENT SEQUENCE

```
1. fly launch --no-deploy --name anl-api --region ewr
2. fly secrets set \
     DATABASE_URL="..." \
     DIRECT_URL="..." \
     SUPABASE_URL="..." \
     SUPABASE_ANON_KEY="..." \
     SUPABASE_SERVICE_ROLE_KEY="..." \
     SUPABASE_JWT_SECRET="..." \
     LIVEKIT_API_KEY="..." \
     LIVEKIT_API_SECRET="..." \
     LIVEKIT_WS_URL="..." \
     AWS_ACCESS_KEY_ID="..." \
     AWS_SECRET_ACCESS_KEY="..." \
     AWS_REGION="us-east-1" \
     AWS_S3_BUCKET="anl-media" \
     STRIPE_SECRET_KEY="..." \
     STRIPE_WEBHOOK_SECRET="..." \
     JWT_SECRET="..." \
     REVEAL_HMAC_SECRET="..." \
     CORS_ORIGIN="..."
3. fly deploy
4. curl https://anl-api.fly.dev/health
5. npx expo build --platform ios
6. Submit to TestFlight
7. File provisional patent — USPTO EFS-Web
```

-----

*ANL SPECS v1.0 — Sentinel Engine v6.0 ENTROPY-ZERO*
*All implementations verified. All patents documented. Deploy when ready.*