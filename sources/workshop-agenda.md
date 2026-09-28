# EG – Contentful onsite workshop agenda (pasted 2026-09-28)

Cross-channel proof point delivery and the Content Resolution API
Cross-channel proof points
Owner: Globant, Contentful and Salesforce
End to end flow: NBA decision, notification to the channel, channel retrieves the proof point by reference
The proposed resolution layer: what Contentful provides natively, what needs configuration, and what would be custom build
Ownership of any custom layer: who builds, hosts and supports it
How SFMC retrieves content at send time
Performance at production volume, including the burst of requests after a large send
Failure handling and fallback
Whether the same pattern serves partner web and VMC
Reference implementations of this pattern
Target delivery pattern agreed in principle
Custom build elements and their ownership identified
Latency and volume assumptions documented for validation
Questions for NBA Engineering logged


NBA hand-off: variant metadata, payload and feedback loop
Cross-channel proof points
Owner: Globant w/ Contentful
How NBA reads variant metadata to choose a proof point variant
Shared taxonomy between the CMS and NBA
Contents of the notification payload sent to channels
Reporting the served variant back to NBA, including fallbacks
High-level understanding of how NBA would read content data and metadata from the platform
Considerations for a future NBA build identified
NBA follow-ups logged (NBA Engineering not attending)


Lunch
Partner web display layer and front end architecture
Partner web content
Owner: ContenExceltful w/ Globant
Front end approach: who builds, hosts and maintains it
Rendering, caching and page performance
Live preview and visual editing
Mapping content types to front end components and the design system, including the 2027 brand refresh
What Web Ops can change without engineering versus what needs a developer
Running multiple partner sites from one instance
SEO, tracking, consent, accessibility and EG security requirements
Display layer architecture and ownership understood
Split of self-serve versus engineering work agreed
Hosting and security requirements identified for EG review


AEM migration approach
Partner web content
Owner: Globant and Contentful
Content scope: what migrates, what gets rebuilt, what gets retired
Phased migration and AEM/Contentful coexistence
Ongoing development vs. code freeze on AEM
Cutover approach, including migration tooling and SEO protection
Timing against the AEM contract end
Migration approach and phasing understood
Code freeze and coexistence rules clear for Web Ops planning
Cutover risks identified
