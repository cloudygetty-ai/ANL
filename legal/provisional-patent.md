# PROVISIONAL PATENT APPLICATION
## AllNightLong (ANL) — USPTO EFS-Web Filing

**Applicant:** [Your Full Legal Name]
**Date of Invention:** 2025
**Attorney Docket:** ANL-2025-PROV-001
**International Classification:** G06F 16/9537, G06Q 50/00

---

## TITLE OF INVENTION

**System and Method for Circadian-Aware, Venue-Anchored, Voice-Chemistry-Scored Proximity Matching with Cryptographic Mutual Reveal and Social Graph Exclusion**

---

## CROSS-REFERENCE

This application claims benefit under 35 U.S.C. § 119(e).

---

## FIELD OF THE INVENTION

Systems and methods for computing romantic compatibility between users of a location-based social platform, incorporating chronobiological patterns, acoustic feature analysis, geospatial venue affinity, cryptographic identity protection, and social proximity graph exclusion.

---

## BACKGROUND

Existing proximity-based social and dating applications (Tinder, Hinge, Grindr, Sniffies) rank candidate profiles using static filters (age, distance, photos) and binary swipe mechanics. These systems:

1. Ignore temporal patterns of user activity and circadian alignment
2. Do not incorporate acoustic or vocal chemistry signals
3. Do not leverage shared venue presence as a matching signal
4. Expose user identity before mutual consent is established
5. Do not exclude candidates based on social proximity (mutual contacts)

The present invention addresses all five deficiencies simultaneously through a unified ranking pipeline (VCMS+) combining five independent scoring engines.

---

## SUMMARY OF THE INVENTION

The present invention provides a computer-implemented system comprising five novel subsystems:

1. **Circadian Compatibility Scoring (CCS)** — chronotype-based activity alignment scoring
2. **Venue Affinity Scoring (VAS)** — shared physical venue presence and dwell-time matching
3. **Voice Chemistry Scoring (VCS)** — real-time acoustic feature analysis for compatibility
4. **Cryptographic Mutual Reveal (CMR)** — HMAC-commitment-based identity disclosure gating
5. **Social Graph Exclusion Engine (SGEE)** — contact-hash-based social proximity filtering

These subsystems are combined via a weighted ranking pipeline designated VCMS+ defined as:

> **VCMS+ = 0.35 × Proximity + 0.25 × CCS + 0.25 × VAS + 0.15 × VCS**

---

## DETAILED DESCRIPTION OF PREFERRED EMBODIMENTS

### CLAIM SET 1 — Circadian Compatibility Scoring (CCS)

**Technical Description:**

The CCS engine maintains a `circadian_profile` per user, constructed from timestamped `activity_events` (discovery opens, swipes, messages, location updates). A user's activity distribution across 24 hours is modeled as a probability density. The system computes:

- **Primary bucket:** MORNING (05:00–11:59), AFTERNOON (12:00–17:59), EVENING (18:00–22:59), NIGHT (23:00–04:59)
- **Chronotype score:** float 0.0–1.0 representing night-owl tendency
- **Overlap score:** cosine similarity between two users' hourly activity distributions
- **Recency weight:** exponential decay applied to events older than 30 days

Compatibility score formula:

```
overlapScore = cosineSimilarity(user_A.hourlyDist, user_B.hourlyDist)
chronotypeAlignment = 1 - |user_A.chronotypeScore - user_B.chronotypeScore|
CCS = 0.7 × overlapScore + 0.3 × chronotypeAlignment
```

Output: `{ score: float, label: string, reason: string, primaryBucket: string }`

**Novelty:** No prior art applies chronotype/circadian modeling to proximity dating match ranking. Activity timestamps are used to infer biological sleep schedule alignment rather than explicit user input.

---

### CLAIM SET 2 — Venue Affinity Scoring (VAS)

**Technical Description:**

The VAS engine detects shared physical venue presence using PostGIS spatial queries and builds per-user `venue_affinity_profiles` encoding venue-category preferences and dwell-time patterns.

Key components:

- **Venue detection:** `ST_DWithin(user_location, venue_location, radius_meters)` with radius defined per venue category (bars: 75m, clubs: 100m, parks: 150m)
- **Dwell detection:** user must remain within venue radius for ≥ 5 minutes to count as a visit
- **Affinity scoring:** weighted by recency (exponential decay, λ=0.1/day) and dwell duration
- **Venue-triggered matching:** when two compatible users are simultaneously detected at the same venue, a `venue_match_event` is emitted

Affinity score formula:

```
affinityScore(user, venue) = Σ (recencyWeight(visit) × dwellWeight(visit.duration))
VAS(user_A, user_B) = jaccardSimilarity(user_A.topVenues, user_B.topVenues)
                    + coPresenceBonus (if simultaneously at same venue: +0.3)
```

Output: `{ score: float, sharedVenues: string[], coPresent: boolean }`

**Novelty:** Real-time venue co-presence as a compatibility signal combined with historical venue affinity profile similarity. No prior art uses simultaneous physical venue presence as an active match trigger in proximity dating.

---

### CLAIM SET 3 — Voice Chemistry Scoring (VCS)

**Technical Description:**

The VCS engine analyzes acoustic features extracted from voice calls between matched users to compute a real-time chemistry score. Features are sampled client-side every 5 seconds via the Web Audio API and transmitted as structured feature vectors (not raw audio, preserving privacy).

Feature vector per sample:

```
{ pitchMean, pitchVariance, speakingRate, pauseFrequency,
  volumeRms, laughDetected (bool), overlapDetected (bool) }
```

Chemistry score computation:

```
pitchEngagement   = min(normalize(A.pitchVariance), normalize(B.pitchVariance))
speakingRateScore = max(0, 1 - |A.speakingRate - B.speakingRate| / 3)
pauseScore        = normalize(avgPauses, 5, 20)
volumeScore       = max(0, 1 - |A.volumeRms - B.volumeRms| / 0.3)
laughScore        = min(1, (A.laughRate + B.laughRate) × 3)
overlapScore      = normalize(avgOverlap, 0.05, 0.25)

VCS = 0.20×pitchEngagement + 0.15×speakingRateScore + 0.15×pauseScore
    + 0.10×volumeScore + 0.25×laughScore + 0.15×overlapScore
```

Minimum window: 6 samples (30 seconds) before score is considered valid.

Output: `{ score: float, label: string, primaryDriver: string, breakdown: object }`

**Novelty:** Application of multi-feature acoustic compatibility scoring to real-time romantic chemistry assessment during voice/video calls. Laugh co-detection as the highest-weighted signal is novel. Privacy-preserving client-side extraction is novel versus server-side audio analysis.

---

### CLAIM SET 4 — Cryptographic Mutual Reveal (CMR)

**Technical Description:**

The CMR system gates identity disclosure behind a cryptographic commitment scheme. Neither user's detailed profile (full photos, bio, contact information) is revealed unless both parties independently commit to reveal.

Protocol:

1. **Commit phase:** User A calls `POST /reveal/commit`. Server generates:
   ```
   commitment = HMAC-SHA256(secret=REVEAL_HMAC_SECRET, data=userId+targetId+timestamp)
   ```
   Commitment is stored with TTL = 72 hours.

2. **Mutual detection:** Server checks for a matching commitment from the target user.

3. **Reveal phase:** On mutual commit, `GET /reveal/payload/:id` returns the full profile. A `reveal_audit_log` entry is written (immutable, non-deletable) for compliance.

4. **Revocation:** Either user may call `DELETE /reveal/commit/:id` to withdraw before mutual reveal occurs. Post-reveal revocation is not permitted (audit log preserved).

**Novelty:** HMAC-commitment-scheme applied to identity reveal in social/dating contexts. The asymmetric revocation rule (pre-reveal only) and audit log immutability are novel. No prior art applies cryptographic commitments to mutual identity disclosure gating in proximity applications.

---

### CLAIM SET 5 — Social Graph Exclusion Engine (SGEE)

**Technical Description:**

The SGEE filters the discovery pool to exclude users who appear in the requesting user's social graph (phone contacts, mutual platform connections), preventing the awkward scenario of encountering known contacts in a proximity dating context.

Implementation:

1. **Contact ingestion:** User uploads contacts as SHA-256 hashed phone numbers (`contact_hashes` table). Raw numbers are never stored.
2. **Exclusion query:**
   ```sql
   SELECT target_id FROM contact_hashes ch
   JOIN users u ON u.phone_hash = ch.contact_hash
   WHERE ch.user_id = $requestingUser
   ```
3. **Discovery filter:** Excluded IDs are removed from the candidate pool before any scoring occurs.
4. **Bidirectional exclusion:** If user A has user B in contacts, user B also will not see user A (symmetric).
5. **User control:** `social_exclusion_enabled` flag per user; opt-out available.

**Novelty:** Hash-based contact matching for social graph exclusion in proximity dating. Bidirectional symmetric exclusion from a one-sided contact import is novel. Privacy-preserving implementation (hash-only storage) combined with symmetric enforcement is novel.

---

## CLAIMS

**Claim 1.** A computer-implemented method for computing a compatibility score between a first user and a second user of a proximity-based social platform, comprising: collecting timestamped activity events for each user; computing a circadian activity distribution from said events; computing a chronotype score from said distribution; and computing a circadian compatibility score as a weighted combination of cosine similarity between activity distributions and alignment of chronotype scores.

**Claim 2.** The method of Claim 1, wherein the circadian activity distribution is weighted by an exponential decay function applied to events older than a configurable recency threshold.

**Claim 3.** A computer-implemented method for venue-anchored compatibility matching, comprising: detecting simultaneous physical presence of two users within a geofence of a venue using PostGIS spatial queries; computing venue affinity profiles from historical dwell-time data for each user; computing a venue affinity score as a Jaccard similarity of top venues weighted by recency; and emitting a venue-triggered match event when co-presence is detected for users with affinity scores above a threshold.

**Claim 4.** The method of Claim 3, wherein venue co-presence detection requires a minimum dwell time within the geofence before a venue visit is recorded.

**Claim 5.** A computer-implemented method for real-time acoustic chemistry scoring during a voice communication session, comprising: sampling acoustic feature vectors from each participant at fixed intervals; transmitting feature vectors as structured data without raw audio; computing a chemistry score from a weighted combination of pitch variance alignment, speaking rate similarity, pause frequency, volume consistency, laugh detection rate, and speech overlap rate; and updating the chemistry score in real-time as new feature vectors are received.

**Claim 6.** The method of Claim 5, wherein laugh detection is weighted higher than all other acoustic features.

**Claim 7.** A computer-implemented method for cryptographic mutual identity reveal, comprising: generating a commitment token as an HMAC of user identifiers and a server secret; storing the commitment with a time-to-live; detecting when a matching commitment exists from a target user; revealing full profile data only upon mutual commitment detection; and writing an immutable audit log entry upon reveal.

**Claim 8.** The method of Claim 7, wherein commitment revocation is permitted only before mutual reveal occurs, and audit log entries are immutable after reveal.

**Claim 9.** A computer-implemented method for social graph exclusion in proximity matching, comprising: storing hashed contact identifiers for each user without storing raw contact data; performing symmetric bidirectional exclusion such that if user A's hash matches user B's profile, both users are excluded from each other's discovery pool; and applying said exclusion filter before any compatibility scoring occurs.

**Claim 10.** A computer-implemented system implementing a unified compatibility ranking pipeline (VCMS+) combining: a proximity score weighted at 0.35; a circadian compatibility score weighted at 0.25 as defined in Claim 1; a venue affinity score weighted at 0.25 as defined in Claim 3; and a voice chemistry score weighted at 0.15 as defined in Claim 5; wherein the pipeline is applied to rank a discovery pool of candidate users for presentation to a requesting user.

---

## ABSTRACT

A system and method for computing multi-dimensional romantic compatibility between users of a location-based social platform. Five independent engines — Circadian Compatibility Scoring (CCS), Venue Affinity Scoring (VAS), Voice Chemistry Scoring (VCS), Cryptographic Mutual Reveal (CMR), and Social Graph Exclusion Engine (SGEE) — are combined in a unified weighted ranking pipeline (VCMS+). CCS aligns users by chronobiological activity patterns. VAS matches users by shared physical venue history and real-time co-presence. VCS analyzes acoustic features during voice calls to compute chemistry. CMR gates identity disclosure behind a cryptographic commitment scheme requiring bilateral consent. SGEE filters known social contacts from the discovery pool using hash-based matching. Together these systems provide a novel compatibility matching architecture that addresses temporal, spatial, acoustic, privacy, and social dimensions simultaneously.

---

## FILING INSTRUCTIONS

1. File at USPTO EFS-Web: https://efs.uspto.gov
2. Form: SB/16 (Provisional Application Cover Sheet)
3. Fee: $320 (small entity) or $160 (micro-entity — check qualification)
4. Attach: this document as specification + any drawings/screenshots
5. Deadline for full utility application: 12 months from provisional filing date
6. Classes: 9 (Software) + 45 (Dating/social introduction services)

> **ACTION REQUIRED:** File immediately. All 5 features are implemented and deployed. The 12-month provisional window begins on the filing date. Do not defer.
