# SnapShare Scaling Plan

SnapShare is a photo-sharing app where users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- Registered users: 10,000,000
- Active each day: 10%
- Each active user uploads 1 photo per day
- Each active user views 50 feed pages per day
- Average photo size: 2 MB
- Each photo also gets one thumbnail of 50 KB
- Peak traffic is 5 times the average
- One day has 86,400 seconds (24 × 60 × 60)
- One year has 365 days
- Storage uses decimal units (1 TB = 1,000,000 MB)

**Daily active users (DAU):** 10,000,000 × 10% = **1,000,000 users**

## 2. Estimates

### Uploads per second

- Uploads per day: 1,000,000 users × 1 photo = 1,000,000
- Average: 1,000,000 ÷ 86,400 ≈ **12 uploads per second**
- Peak (5×): ≈ **58 uploads per second** (about 60)

### Feed views per second

- Feed views per day: 1,000,000 users × 50 = 50,000,000
- Average: 50,000,000 ÷ 86,400 ≈ **579 feed views per second**
- Peak (5×): ≈ **2,894 feed views per second** (about 2,900)

### Photo storage per year

- Photos per day: 1,000,000 × 2 MB = 2,000,000 MB = 2 TB
- Photos per year: 2 TB × 365 = **730 TB**
- Thumbnails per day: 1,000,000 × 50 KB = 50 GB
- Thumbnails per year: 50 GB × 365 ≈ 18 TB
- Total per year: 730 TB + 18 TB ≈ **748 TB** (about 0.75 petabytes)

| Measure | Average | Peak (5×) |
|---|---|---|
| Uploads per second | 12 | 58 |
| Feed views per second | 579 | 2,894 |

| Storage | Per year |
|---|---|
| Original photos | 730 TB |
| Thumbnails | 18 TB |
| Total | 748 TB |

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. Each day there are about 50,000,000 feed views but only 1,000,000 uploads, so there are about 50 reads for every write.

What this means for the design:

- Make reads fast and cheap: keep popular data in a cache and serve photos from a CDN.
- Add read replicas of the database so reads are spread out and the main database is not overwhelmed.
- Writes can do some extra work, such as creating thumbnails in the background, because there are far fewer of them.
- Storage still grows very quickly because every photo is large, so the photo files need storage built for that size.
## 4. Where the photos are stored

Photos should **not** be stored inside the database. Each photo is about 2 MB, and the app adds about 730 TB of photos a year. Storing files that large in a database would make it huge, slow down backups and copies to replicas, cost much more per gigabyte, and force every image request through a database that should only handle small, fast queries.

Instead, the photo files go into **object storage**, a service built to hold huge numbers of large files cheaply and safely. The database keeps only small details about each photo: its id, owner, caption, upload time, and the location (key) of the file in object storage. The CDN then serves the files to users.
## 5. Architecture diagram

```
Users (phones and browsers)
  |
  |-- photo and thumbnail requests --> [ CDN ] --(on a cache miss)--> [ Object storage ]
  |
  |-- page and API requests ---------> [ Load balancer ]
                                            |
                                            v
                  [ App server 1 ]   [ App server 2 ]   [ App server 3 ]
                                            |
  +-----------------------+-----------------+-----------------------+
  |                       |                 |                       |
  v                       v                 v                       v
[ Cache ]        [ Primary database ]  [ Object storage ]       [ Queue ]
(checked first          |              (original photos)             |
 for feeds)             | copies data                                v
                        v                                       [ Worker ]
                [ Read replica ]                                    |
                (answers feed reads)                                |
                                                                    v
                                         creates the 50 KB thumbnail, saves it
                                         to Object storage, and updates the database
```

## 6. What each component does

- **CDN:** Keeps copies of photos and thumbnails on servers close to users, so images load quickly and our own servers aren't hit for every view.
- **Load balancer:** Spreads incoming requests across several app servers so no single server is overloaded, and keeps the app running if one server fails.
- **App servers:** Run the SnapShare logic (login, upload, feed), and we can add more copies of them as traffic grows.
- **Cache:** Keeps frequently used data, such as built feeds and photo details, in fast memory so most feed views never reach the database.
- **Primary database:** Stores users, follows and photo details reliably, and handles all the writes.
- **Read replica:** Holds a copy of the primary database that answers read queries, which takes the heavy feed-reading load off the primary.
- **Object storage:** Stores the photo and thumbnail files cheaply and safely at a size of hundreds of terabytes.
- **Queue:** Holds thumbnail jobs so an upload can finish straight away while the slower work happens later.
- **Worker:** Takes jobs from the queue and creates the thumbnails, so users never wait for image processing.

## 7. Upload flow, step by step

1. The user picks a photo and taps upload. The request goes to the **load balancer**.
2. The load balancer passes it to one of the **app servers**.
3. The app server checks that the user is logged in and that the file is a valid photo within the size limit.
4. The app server saves the original photo in **object storage**.
5. The app server saves a new row in the **primary database** with the photo id, owner, caption, upload time, file location, and a thumbnail status of "pending".
6. The app server puts a "create thumbnail" job on the **queue**.
7. The app server tells the user the upload succeeded, without waiting for the thumbnail.
8. A **worker** takes the job from the queue, reads the original photo, and creates a 50 KB thumbnail.
9. The worker saves the thumbnail in object storage and updates the database row to "thumbnail ready".
10. When followers open their feed, the cache and read replica supply the photo details, and the **CDN** delivers the thumbnail.

## 8. Trade-offs

1. **Cache: speed versus freshness.** A cache makes feeds load much faster and protects the database, but it can show slightly old data, so a new photo might take a few seconds to appear. It also adds complexity because the cache must be kept in sync with the database.
2. **Read replica: scale versus consistency.** Replicas let us serve many more reads, but they copy data from the primary with a small delay. A user might not see their own new photo for a moment. We can reduce this by reading a user's own recent uploads from the primary.
3. **Queue and worker: fast uploads versus delayed thumbnails.** Uploads finish quickly because thumbnails are made in the background, but for a short time a photo may show a placeholder instead of its thumbnail. We also have an extra system to run and monitor.
4. **Cost versus quality of storage.** Keeping every 2 MB original costs about 730 TB a year. Compressing photos or removing old ones would save money, but it would reduce quality or lose data.