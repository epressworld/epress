# epress world: A Decentralized Social and Content Network

**Version 1.0**

---

### Abstract

This paper proposes a fully peer-to-peer electronic protocol designed to build a decentralized social and content network, addressing the structural challenges of centralized networks in data sovereignty, information trust, and value retention. The core architecture consists of sovereign nodes fully controlled by users through cryptographic keys. Interactions between nodes rely on signed content hashes, creating undeniable "speech facts" that permanently bind a creator’s identity, content, and timestamp. These cryptographically verified facts collectively form a globally unified, publicly traceable "thought graph." This paradigm lays a robust foundation for a new value-driven internet where creators truly own their digital assets, contributions are objectively measurable, and reputational value can be preserved and carried across platforms.

---

### 1. Introduction: Structural Challenges of the Current Internet

Since its inception, the internet has evolved into the cornerstone of global information exchange and social collaboration. Its dominant architecture, built on centralized server-client models, has greatly facilitated information dissemination and connectivity. However, as the internet ecosystem matures, the inherent limitations of this centralized structure have become increasingly evident, manifesting in three irreconcilable structural challenges.

**1.1 Centralized Data Sovereignty**

In the prevailing architecture, users create content but do not own their digital assets. Text, images, videos, and social connections are stored on servers owned by service providers. Users are akin to "tenants" of these platforms rather than "owners" of their digital homes.

This means a creator with millions of followers risks having their account and accumulated digital assets frozen or erased due to a platform’s policy shift, an algorithmic error, or malicious competition. Their identity, content, and social graph are tightly bound to the platform, non-transferable, and perpetually exposed to systemic risks of platform governance.

**1.2 Lack of Trust and Information Attribution**

Current internet protocols lack a native trust layer. There is no cryptographically verifiable binding between information and its source, creating fertile ground for misinformation and identity fraud, potentially leading to a "bad money drives out good" cycle in content quality.

Users and developers are forced to rely on platform operators’ judgment rather than verifiable facts, significantly increasing the cost of information interaction[^1] and lowering the signal-to-noise ratio.

**1.3 Fragmented and Lost Value**

Users’ reputation, influence, and the value of their contributions are trapped within isolated platform "silos." A creator with significant influence on Platform A cannot transfer their reputation or social connections to Platform B, forcing them to start from scratch.

For example, an expert in a professional field (e.g., science or art) with a strong reputation on one platform cannot carry that credibility to a new, specialized community. Their past contributions do not serve as direct proof of reputation in new environments. This fragmentation hinders the formation of a creator-centric internet economy where value can freely flow and accumulate.

---

### 2. The epress World: An Internet Where Value Persists

Addressing these structural challenges requires not incremental fixes to existing platforms but a paradigm shift in architecture. The epress vision is built on two core principles: **individual sovereignty**, returning rights to individuals, and **verifiable communication**, grounding interactions in facts.

These principles give rise to a radically different internet.

**2.1 Digital Assets That Are Never Lost**

Imagine your digital life as analogous to moving in the physical world. When relocating to a new city, your identity, books, and contact list remain your personal property, carried with you.

In the epress world, this vision is realized. Your digital identity (controlled by a cryptographic wallet), your created content, and your social connections are truly your assets, not a company’s liabilities. You can switch node providers (like choosing a telecom operator) or host your node on your home computer, and all your digital assets follow seamlessly. Platform shutdowns or bans no longer mean the end of your digital existence.

**2.2 Accumulable Digital Reputation**

In the epress world, every signed piece of content has a unique, immutable address (its content hash), akin to a published paper’s DOI (Digital Object Identifier).

This enables "citations" to be precisely tracked and measured. A creator’s true value is no longer fleeting "traffic" or inflated "follower counts" but the objective record of how their ideas and works are cited, discussed, and remixed across the network.

This reputation, permanently tied to your sovereign identity, accumulates over time, becoming your most valuable, truly owned digital asset. Contributions become measurable, and value persists.

**2.3 An Open Innovation Ecosystem**

When social graphs and content records move from closed "corporate intranets" to an open, trusted public data layer, innovation is unleashed. Anyone—whether a large company or an independent developer—can build previously unimaginable applications on this open protocol without permission.

Examples include:
* **Digital Archaeology of Idea Spread**  
  With verifiable and traceable content sources and citations, researchers can map the origin, evolution, and spread of any idea, theory, or meme across the network, like archaeologists studying cultural artifacts.
* **Composable, User-Centric Social Algorithms**  
  Unlike current platforms where users are subject to opaque recommendation algorithms, epress’s open ecosystem allows algorithms to exist as independent services. Users can choose, combine, or write their own algorithms to shape their experience—e.g., an algorithm to "only show trusted voices," "maximize novelty," or "focus on a niche domain." Algorithmic control returns to users.
* **Decentralized Proof of Contribution Systems**  
  Based on the verifiable citation network, developers can build domain-specific reputation systems. For example, a scientific system could calculate a paper’s (content hash’s) "impact factor" based on citations within the epress network, or an art-focused system could trace how an original work inspires derivative creations. Such objective, verifiable proofs of contribution are far more valuable than subjective "likes."

---

### 3. epress world protocol (EWP)

The epress world protocol (EWP) is a peer-to-peer social network protocol designed to realize this vision. It defines a comprehensive set of cryptographically verified interaction rules for node identity, connection management, and content distribution. EWP’s core principle is "don’t trust, verify," ensuring every significant interaction is provable and undeniable, creating a trusted network without centralized arbitration.

**3.1 Core Components of the Protocol**

EWP is built on three foundational concepts:

* **Sovereign Node**: The basic unit of the network, a software instance fully owned by a user via their Ethereum address, typically presented as a public personal website. Each node has a unique cryptographic identity and a publicly queryable profile.
* **Verifiable Publication**: The unit of information flow. EWP distinguishes two states:  
  1. **Local Publication**: Content exists only on the creator’s node, publicly visible but editable or removable at the owner’s discretion, providing a private space for creation.  
  2. **Signed Publication**: The creator signs the content’s hash with their Ethereum private key, creating an immutable "speech fact" binding their identity, content, and timestamp. Only signed publications enter EWP’s distribution process.
* **Consensus Connection**: A unidirectional "follow" relationship between nodes, established via a cryptographic "handshake" to ensure mutual consent and awareness.

**3.2 Core Protocol Workflows**

To understand how this architecture operates, adopt a new worldview: in the epress network, each "node" is not just a website but an independent, active "**social entity**," representing its owner’s full presence in the network. When a node "follows" another, it’s not a technical link but a **social commitment** between owners, mediated by their sovereign nodes, to subscribe to signed publications.

EWP, as an HTTP-based application-layer protocol, coordinates complex node interactions through well-defined RESTful APIs, designed around the principle of verifiability for security and efficiency.

#### **3.2.1 Node Identity Discovery**

In a decentralized network, all interactions begin with identity confirmation. A node needs a standardized way to query another node’s public profile. EWP mandates:
* Every epress node must implement a `/ewp/profile` endpoint at its root URL.
* A simple `GET` request (e.g., `GET https://bob.blog/ewp/profile`) retrieves the target node’s public profile, including its Ethereum address, name, and description.
  ```json
  {
    "address": "0x...",      // Node’s Ethereum address, its unique identity
    "title": "Node Title",   // Node’s public name or title
    "url": "https://...",    // Node’s publicly accessible URL
    "description": "Node description" // Brief node description
  }
  ```

This mechanism underpins all subsequent interactions, such as establishing connections.

#### **3.2.2 Connection Management**

* **Establishing a Connection (Following)**  
  To prevent unilateral inconsistencies, establishing a follow relationship requires a synchronized confirmation process:  
  1. **Intent Signing**: The follower signs an EIP-712[^2]-compliant "follow intent" data structure containing both parties’ identities.  
     ```json
     {
       "followeeAddress": "0xAddressOfFollowee", // Followee’s Ethereum address
       "followeeUrl": "https://followee.node",   // Followee’s node URL
       "followerUrl": "https://follower.node",   // Follower’s node URL
       "timestamp": 1678886400                  // Timestamp to prevent replay attacks
     }
     ```
  2. **Submission and Verification**: The signed intent is submitted to the followee’s node, which verifies the signature locally.  
  3. **Synchronized Confirmation**: Upon verification, the followee does not immediately write to its database but sends a `POST` request to the follower’s `/ewp/connections` endpoint to confirm the connection.  
  4. **Mutual Write**: The follower, after verifying the request, creates the connection record in its database and responds with success. The followee then creates its record upon receiving the success response.  
     Example database records (Alice following Bob):  
     ```json
     # Alice’s node database:
     {
       "follower_address": "self",
       "followee_address": "0xAddressOfBob",
       "created_at": "2025-09-12T10:30:00Z"
     }

     # Bob’s node database:
     {
       "follower_address": "0xAddressOfAlice",
       "followee_address": "self",
       "created_at": "2025-09-12T10:30:00Z"
     }
     ```
     This "two-phase commit" ensures the connection is only established after both parties successfully record it.

* **Disconnecting (Unfollowing)**  
  Unfollowing is also a signed operation. The initiator (follower) signs an "unfollow" message and sends it via a `DELETE` request to the followee’s node. Both parties verify the signature and delete their respective connection records.  
  ```json
  {
    "followeeAddress": "0xAddressOfFollowee", // Followee’s Ethereum address
    "followerAddress": "0xAddressOfFollower", // Follower’s Ethereum address
    "timestamp": 1678886400                  // Timestamp to prevent replay attacks
  }
  ```

#### **3.2.3 Content Signing and Distribution**

EWP’s content distribution mechanism ensures efficient and verifiable information replication.

* **Content Signing**  
  When a creator shares local content to the network, they sign its SHA-256 hash with their Ethereum private key, creating an immutable "publication proof" binding the content hash, publisher address, and timestamp. This proof is an EIP-712 structured data with the primary type "ContentSignature."  
  ```json
  {
    "contentHash": "0xHashOfContent...",      // SHA-256 hash of the content
    "publisherAddress": "0xAddressOfPublisher", // Publisher’s Ethereum address
    "timestamp": 1678886400                  // Publication timestamp
  }
  ```

* **Content Distribution**  
  To balance performance and security, EWP uses an efficient "Notify-Pull" model:  
  1. **Notification**: The publisher’s node sends a lightweight `POST` notification to all followers’ `/ewp/replications` endpoints, containing only the "publication proof" (signed data), not the content itself.  
     Request payload:  
     ```json
     {
       "typedData": {
         "primaryType": "ContentSignature",
         "message": {
           "contentHash": "0xHashOfContent...",
           "publisherAddress": "0xAddressOfPublisher",
           "timestamp": 1678886400
         },
         ... // Other EIP-712 fields (domain, types)
       },
       "signature": "0x..." // Signature of the typedData
     }
     ```
  2. **Verification and Pull**: The follower node verifies the signature and checks if the publisher is in its follow list. If valid, it pulls the full content using a `GET /ewp/contents/{hash}` request to the publisher’s node.  
     The response varies by content type, with headers guiding proper handling.  

     **Example 1: Fetching Markdown Text**  
     The core text exchange format, delivered as UTF-8 encoded Markdown.  
     ```http
     HTTP/1.1 200 OK
     Content-Type: text/markdown; charset=utf-8
     Content-Length: 528

     # This is a heading

     This is a paragraph, the primary text format circulated in the epress network.

     * List item one
     * List item two
     ```

     **Example 2: Fetching Images or Other Files**  
     File responses include rich metadata like filename and description.  
     ```http
     HTTP/1.1 200 OK
     Content-Type: image/jpeg
     Content-Length: 213886
     Content-Disposition: inline; filename="awesome-photo.jpg"
     Content-Description: A photo of an awesome sunset.

     [...binary image data stream...]
     ```
  3. **Final Validation and Storage**: After retrieving the content, the follower node recalculates its hash and compares it with the proof’s hash. Only if they match is the content stored as a replica.

This mechanism shifts heavy content transfer to an on-demand pull by recipients, reducing the publisher’s broadcast burden while ensuring content integrity and authenticity through cryptographic verification.

**3.3 Protocol Interface Overview: A Standardized Node**

EWP’s core idea is to endow each node with standardized capabilities. Every epress node is an independent, peer-to-peer server implementing these API endpoints:

* **Identity Capabilities**  
  * `GET /ewp/profile`: Provides the node’s public identity information.  
  * `GET /ewp/avatar`: Serves the node’s avatar.  
  * `POST /ewp/nodes/updates`: Receives profile update notifications from other nodes to ensure consistency (e.g., URL changes).

* **Connection Capabilities**  
  * `POST /ewp/connections`: Receives and confirms follow requests.  
  * `DELETE /ewp/connections`: Handles unfollow notifications.

* **Content Exchange Capabilities**  
  * `POST /ewp/replications`: Receives new content publication notifications from followed nodes (push).  
  * `GET /ewp/publications`: Provides access to publication history, enabling nodes to catch up on missed content after being offline (pull).  
  * `GET /ewp/contents/{hash}`: Serves signed content’s raw data.

Anyone can develop and run a protocol-compliant node in any programming language. Countless such nodes, interconnected and freely exchanging information, form the "epress world"—an open, verifiable, decentralized social and content network where data sovereignty is ensured, data provenance is traceable, and value is neither siloed nor lost.

---

### 4. Vision: A Computable Reputation Economy

A fully participatory epress world holds immense potential. The EWP protocol’s technical foundation will enable new applications and economic models unimaginable in today’s internet, transforming it from an "information internet" to a "**value internet**" where the value of ideas and individual reputation is computable, accumulable, and portable.

**4.1 Discovering the Value of Ideas: Decentralized "PageRank"**

The epress world network is inherently a directed graph of sovereign identities (nodes), signed publications (content), and citation relationships (connections)—a globally unified "thought graph." Developers can build decentralized "idea search engines" where the value of an idea (represented by its content hash) is calculated objectively, similar to Google’s PageRank, based on the reputation and number of citing nodes. This allows profound, valuable ideas to stand out from the noise.

**4.2 Objective Reputation Measurement: Verifiable Proof of Contribution**

Since all contributions (signed publications) are immutably tied to a persistent identity, a participant’s contribution history is public and auditable. This enables domain-specific, objective proof-of-contribution systems. For instance, in academia, a scientist’s impact could be measured directly by citations and discussions of their work in the epress network, independent of journals. Such reputation becomes a portable, invaluable intangible asset.

**4.3 An Open Sociological Laboratory: Digital Archaeology of Idea Spread**

The epress world network is a high-fidelity database of verifiable, timestamped communication events. This provides social scientists and data researchers an unbiased "petri dish" to study how ideas and cultural memes originate, mutate, spread, and fade. Unlike centralized platforms’ filtered "second-hand data," this network offers a pristine view of human thought and cultural dynamics.

---

### 5. Conclusion

We propose a fully peer-to-peer electronic protocol for content publishing and social connections. Built on cryptographic proofs rather than trust, it enables direct, verifiable interactions between nodes without centralized intermediaries, offering a new paradigm to address the internet’s core challenges.

By combining user keys, content hashes, and digital signatures, the system creates an immutable, publicly verifiable global thought graph. Each signed publication forms a traceable "speech fact," and each consensus connection adds a trusted structure to this graph.

This robust structure, built from simple components, transcends mere information transfer. It provides an objective, computable foundation for the value of ideas and individual reputation. When contributions are measurable, a creator’s reputation transcends platform barriers, becoming a truly owned, portable digital asset.

This lays a solid technical foundation for a global social and content network where history is immutable, and value is preserved.

---

### Footnotes

[^1]: **Information Interaction Cost**: The collective time, effort, and risk borne by all members of a society or network to assess the authenticity and credibility of information. In systems without cryptographic source verification, the burden of validation falls on individual users, leading to high social discernment costs. A verifiable system automates foundational source authenticity checks, significantly reducing this cost.

[^2]: **EIP-712**: An Ethereum Improvement Proposal defining a standard for signing structured data off-chain. Unlike signing opaque hashes, EIP-712 presents human-readable data structures, enhancing security and usability by mitigating phishing risks. See: [https://eips.ethereum.org/EIPS/eip-712](https://eips.ethereum.org/EIPS/eip-712).