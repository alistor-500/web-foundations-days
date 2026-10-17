# TicketHub Design

TicketHub is a website that sells tickets for concerts and events.

## 1. Requirements

### Functional requirements

- Users can register and log in.
- Users can browse and search upcoming events.
- Users can view an event's details and its seat map, showing which seats are free.
- Users can hold one or more seats for a short time (5 minutes) while they pay.
- Users can pay for their held seats and receive their tickets.
- Users can view the tickets they have bought.

### Non-functional requirements

- **Speed:** event and seat pages load in under 1 second, and a seat hold answers in under 2 seconds, even during a big sale.
- **Correctness:** a seat is never sold to two people, and a customer is never charged without receiving their tickets.
- **Fairness:** during a big sale people are served in the order they arrived, and each person can buy at most 4 tickets.
- **Availability:** the site stays up during a big sale, even when 200,000 people arrive at once.
- **Scalability:** the system copes with a sudden spike many times above normal traffic.
- **Security:** passwords are stored hashed, and card details are handled by a payment provider, not stored by TicketHub.

## 2. Estimates

Assumptions: one day has 86,400 seconds, and peak traffic on a normal day is 5 times the average.

### Normal day

- Visitors: 50,000 per day, each viewing 10 pages
- Page views per day: 50,000 × 10 = 500,000
- Average: 500,000 ÷ 86,400 ≈ **6 page views per second**
- Peak (5×): ≈ **29 page views per second**
- Tickets sold: 5,000 per day, which is 5,000 ÷ 86,400 ≈ **0.06 tickets per second** (about one every 17 seconds)

### Big sale (popular concert goes on sale)

- 200,000 people try to buy 20,000 seats within the first 10 minutes (600 seconds)
- People arriving: 200,000 ÷ 600 ≈ **333 people per second**
- Assumption: each person makes about 5 requests (open the event, view seats, hold, pay, check result)
- Requests: 200,000 × 5 = 1,000,000 in 600 seconds ≈ **1,667 requests per second**
- Seats sold if the show sells out in 10 minutes: 20,000 ÷ 600 ≈ **33 seats per second**
- Only 20,000 of the 200,000 people can succeed, which is **10%**. The other 180,000 (90%) will be disappointed.

### Comparison

| Measure | Normal day | Big sale | Difference |
|---|---|---|---|
| People arriving per second | 0.6 | 333 | about 575 times more |
| Requests per second | 6 | 1,667 | about 290 times more |
| Tickets sold per second | 0.06 | 33 | about 575 times more |

In 10 minutes the big sale sells 20,000 tickets, which is 4 times a whole normal day's sales (5,000).

**Conclusion:** the spike lasts only about 10 minutes, but it is hundreds of times busier than normal. We must design for the spike, not the average, and we must handle the 180,000 people who will not get a seat.

## 3. API

All requests and responses use JSON. The holds, orders and tickets endpoints need the user to be logged in.

### 1. Browse events
- **Method and path:** `GET /events` (optional filters, for example `?search=rock&date=2026-12-01`)
- **Description:** Lists upcoming events.
- **Success status:** `200 OK`

### 2. View one event
- **Method and path:** `GET /events/{event_id}`
- **Description:** Returns the details of one event (name, venue, date, when sales open).
- **Success status:** `200 OK`

### 3. View seats
- **Method and path:** `GET /events/{event_id}/seats`
- **Description:** Returns every seat for the event with its section, row, number, price and status (`available`, `held` or `sold`).
- **Success status:** `200 OK`

### 4. Hold seats
- **Method and path:** `POST /events/{event_id}/holds`
- **Description:** Holds the chosen seats for 5 minutes while the user pays.
- **Example request body:**

```json
{
  "seat_ids": [101, 102]
}
```

- **Success status:** `201 Created` (the response includes `expires_at`)
- **Error:** `409 Conflict` if any of the seats has already been taken. No seats are held in that case.

### 5. Release held seats
- **Method and path:** `DELETE /events/{event_id}/holds`
- **Description:** Gives back the seats the user is holding so other people can buy them.
- **Success status:** `204 No Content`

### 6. Pay for held seats
- **Method and path:** `POST /orders`
- **Description:** Charges the user for their held seats and turns them into tickets.
- **Example request body:**

```json
{
  "event_id": 7,
  "payment_token": "tok_abc123"
}
```

- **Success status:** `201 Created`
- **Errors:** `409 Conflict` if the hold has expired, and `402 Payment Required` if the payment fails.

### 7. View my tickets
- **Method and path:** `GET /me/tickets`
- **Description:** Lists the tickets the user has bought.
- **Success status:** `200 OK`

### Other error codes

- `400 Bad Request`: the request is invalid, for example asking to hold 10 seats when the limit is 4.
- `401 Unauthorized`: the user is not logged in.
- `404 Not Found`: the event does not exist.

## 4. Data model

### users
| Column | Notes |
|---|---|
| user_id | primary key |
| name | required |
| email | required, unique |
| password_hash | required |
| created_at | required |

### events
| Column | Notes |
|---|---|
| event_id | primary key |
| name | required |
| venue | required |
| event_date | required |
| on_sale_at | when ticket sales open |

### seats
One row for each physical seat at each event.

| Column | Notes |
|---|---|
| seat_id | primary key |
| event_id | foreign key to events |
| section, row_label, seat_number | where the seat is |
| price | required |
| status | `available`, `held` or `sold` |
| held_by_user_id | foreign key to users, empty unless held |
| hold_expires_at | when the hold ends, empty unless held |
| order_id | foreign key to orders, empty until sold |

Unique rule: (event_id, section, row_label, seat_number), so the same seat cannot appear twice for one event.

### orders
| Column | Notes |
|---|---|
| order_id | primary key |
| user_id | foreign key to users |
| event_id | foreign key to events |
| total_amount | required |
| payment_status | `paid` or `failed` |
| payment_reference | the payment provider's reference |
| created_at | required |

### Relationships

- **users to orders is one-to-many:** one user can make many orders, and each order belongs to one user.
- **events to seats is one-to-many:** one event has many seats, and each seat row belongs to one event.
- **events to orders is one-to-many:** one event can have many orders.
- **orders to seats is one-to-many:** one order covers several seats, and a sold seat belongs to exactly one order.
- **users to seats (holds) is one-to-many:** a user can temporarily hold several seats, but a seat is held by at most one user at a time.

No join table is needed here because every seat row belongs to a single event and can be sold only once, so it links to at most one order.

## 5. How the design prevents two people buying the same seat

During a big sale thousands of people try for the same seat at the same moment, so this must be solved inside the database, not in the app's memory.

### The wrong way: check, then update

The server reads the seat, sees "available", and then updates it. Two requests can both read "available" before either one updates, so both succeed and the seat is sold twice.

### The right way: one atomic update with a condition

```sql
UPDATE seats
SET status = 'held',
    held_by_user_id = :user_id,
    hold_expires_at = :now_plus_5_minutes
WHERE seat_id = :seat_id
  AND (status = 'available'
       OR (status = 'held' AND hold_expires_at < :now));
```

The database locks the row while it updates it, so requests for the same seat are handled one at a time. The first request changes the seat. When the second request runs, its `WHERE` condition no longer matches, so nothing changes. The app checks how many rows were changed: 1 means the user got the seat, and 0 means someone else did, so the app replies with `409 Conflict`.

### Transactions and isolation levels

A **transaction** groups several changes so that either all of them happen or none do. When someone holds three seats, all three updates run in one transaction. If any seat is already taken, the whole transaction is rolled back, so nobody ends up with a half-finished order.

The **isolation level** decides how much concurrent transactions can see of each other's unfinished work. The strictest level, serializable, makes the database behave as if transactions ran one after another. It is the safest but the slowest under heavy load. We do not need it for seats, because the conditional update above locks the seat row until the transaction ends. In a common database such as PostgreSQL at its default level (read committed), a second transaction that wants the same seat waits for the first to finish, then re-checks the `WHERE` condition, finds the seat already held, and changes nothing. Only the rows being claimed are locked, so thousands of people buying different seats do not block each other. When a transaction holds several seats, it updates them in order of `seat_id`, so two people competing for the same seats cannot lock each other in a deadlock.

### The layers that protect each seat

1. **Atomic hold:** the conditional update lets only one person hold a seat.
2. **Transactions:** multi-seat holds succeed completely or not at all.
3. **Hold expiry:** a hold lasts 5 minutes. After that the seat counts as available again, so abandoned seats return to the pool.
4. **Confirming the sale:** when the user pays, the seats are only marked sold if this user still holds them:

```sql
UPDATE seats
SET status = 'sold', order_id = :order_id
WHERE seat_id = :seat_id
  AND status = 'held'
  AND held_by_user_id = :user_id
  AND hold_expires_at > :now;
```

   The hold is extended a little when payment starts so it cannot expire halfway through paying. If the payment fails, the seats are released. If every seat cannot be marked as sold, the transaction is rolled back and the payment is refunded.
5. **Constraints as a safety net:** `seat_id` is a primary key, and the unique rule on (event_id, section, row_label, seat_number) means each physical seat exists once for an event. A seat row has only one `order_id`, so it can belong to at most one order. A check on `status` allows only `available`, `held` or `sold`. Even if the app code has a bug, the database refuses the worst mistakes.

### Fairness

In a big sale the waiting room (see the architecture) lets people in first come, first served, and each person can hold at most 4 seats.

## 6. Architecture

```
Users (phones and browsers)
  |
  |-- event pages and images -------> [ CDN ]
  |
  |-- during a big sale ------------> [ Waiting room ]  (lets people in at a controlled pace)
  |                                          |
  v                                          v
[ Load balancer ] <--------------------------+
  |
  v
[ App server 1 ]   [ App server 2 ]   [ App server 3 ]   ... more added before a big sale
  |
  |---> [ Cache ]  (event details and the seat map, refreshed every second or two)
  |
  |---> [ Primary database ] ---copies---> [ Read replica ]
  |       (seat holds, sales, orders)        (browsing events, ticket history)
  |
  |---> [ Payment provider ]  (external service that takes the card payment)
  |
  |---> [ Queue ] ---> [ Worker ]  (sends confirmation emails and tickets)
```

### What each component does

- **CDN:** Serves event pages, images and other files that do not change from servers close to users, so our own servers never see that traffic.
- **Waiting room:** Puts people in a fair first-come, first-served line during a big sale and lets them through at a pace the system can handle.
- **Load balancer:** Spreads requests across the app servers so none is overloaded, and keeps the site running if one server fails.
- **App servers:** Run the TicketHub logic (browse, hold, pay), and we add more copies of them before a big sale.
- **Cache:** Keeps event details and the seat map in fast memory so most page views never reach the database.
- **Primary database:** Is the single source of truth for seats and orders, and makes sure each seat is held and sold only once.
- **Read replica:** Answers read-only queries such as browsing events and viewing tickets, so the primary can focus on holds and sales.
- **Payment provider:** Takes card payments safely, so TicketHub never stores card details.
- **Queue and worker:** Send confirmation emails and tickets in the background, so a customer's purchase does not wait for them.

### How the design survives the big sale

- The **waiting room** turns 333 people arriving per second into a steady, controlled flow (for example about 100 people per second, a number we can tune), so the servers and database are never hit by all 200,000 at once.
- The **cache** holds the seat map for a second or two, so thousands of people looking at seats do not each query the database. Only hold attempts reach the primary database.
- We **add app servers before the sale starts**, because we know exactly when it begins.
- Once all 20,000 seats are sold, a "sold out" flag is cached so the remaining people get an instant answer without touching the database.
- The **queue** takes emails and tickets out of the buying path, so slow payments or emails never block people trying to hold seats.
- **Holds expire after 5 minutes**, so seats that people abandon return to the pool quickly.

## 7. Trade-offs

1. **Strong consistency versus speed for seat reservations.** Holds and sales go to the primary database, which is always up to date, so a seat can never be sold twice. Eventual consistency, where seats are updated on copies and sync later, would be faster and easier to scale, but two people could be told they got the same seat. We accept slower, strongly consistent holds because selling a seat twice is the worst failure. Browsing events and viewing tickets can use the cache and read replica, where being a second or two behind is harmless.
2. **Waiting room: protection and fairness versus delay.** It protects the system and gives everyone a fair turn, but people have to wait, some may give up, and it is one more system to build and run.
3. **Cached seat map: speed versus accuracy.** A cache makes seat pages fast and cuts database load, but it can show a seat as free just after someone else took it. That user will get a "seat taken" answer when they try to hold it. This is acceptable because the hold step in the database always has the final say.
4. **Hold time: fairness to buyers versus using every seat.** A long hold gives people time to pay but locks seats that may never be bought. A short hold frees seats quickly but pressures buyers. We chose 5 minutes as a balance.
5. **One primary database for seats: simplicity versus scale.** A single primary keeps the "sold only once" guarantee simple, but it limits how many holds per second we can handle. If TicketHub grows, we could split seat data by event across several databases.

