---
slug: tea-coaster
projectId: BM-001
title: Tea Coaster
description: A coaster powered by the heat of my tea, with a five-minute chime.
category: [PRODUCT DESIGN]
thumbnail: images/tea-coaster.webp
hero: images/tea-coaster.webp
imageAlt: A metal mug resting on the Tea Coaster prototype, with green light visible below its circular base.
featured: true
order: 1
placeholder: false
sections:
  - title: "Why this project"
    paragraphs:
      - "When I moved to NYC, there was one downside to the apartment: electric baseboard heating, which is very expensive. To stay warm in the winter, I drink a lot of tea… but it’s always too easy to forget to drink it at the right temperature. So I thought it would be fun to make a tea coaster powered by the heat of my tea that lets me know when it’s ready, or at least runs for five minutes."
    media:
      type: image
      src: images/tea-coaster.webp
      alt: "A metal mug resting on the Tea Coaster prototype, with green light visible below its circular base."
      fit: cover
      rotation: 0
      caption: "PROTOTYPE / TEA COASTER"
  - title: "TEG testing"
    paragraphs:
      - "A thermoelectric generator (TEG) creates power when there is a temperature difference between its two sides. The amount of power increases as that temperature difference grows. I first had to perform tests to determine the power budget for my design, and created the software you see here to compare various combinations of heat sink sizes and adhesives."
    media:
      type: video
      src: videos/tea-teg-testing.mp4
      poster: images/tea-teg-testing-poster.webp
      label: "Tea Coaster thermoelectric generator testing."
      caption: "VIDEO / TEG TESTING"
  - title: "Component selection"
    paragraphs:
      - "Based on my tests, I selected an efficient boost IC that only requires 0.65 V to start up and 0.35 V to continue operating. I also selected the ATtiny212 as my microcontroller for its ability to operate across a wide range of input voltages. I went with 20 mm tall heat sinks to keep the profile of the tea coaster reasonable, and used thermal glue because it performed the best and required fewer components in the enclosure’s construction."
    media:
      type: video
      src: videos/tea-component-selection.mp4
      poster: images/tea-component-selection-poster.webp
      label: "Close-up video of the Tea Coaster boost IC development."
      caption: "VIDEO / COMPONENT SELECTION"
  - title: "PCB design"
    paragraphs:
      - "The size and design of the PCB were heavily dictated by the size of the four TEGs needed to power the circuit. The TEGs were arranged in 2S2P, which in my tests provided the best balance for my target of five minutes of operation. Six LEDs were placed around the PCB, and I included a supercapacitor to capture the spike in power produced when the tea is first placed on the coaster, before the TEGs heat up and the temperature difference decreases."
      - "During assembly, I removed the button in favor of a buzzer to chime when five minutes had been reached."
    media:
      type: video
      src: videos/tea-pcba.mp4
      poster: images/tea-pcba-poster.webp
      label: "Tea Coaster printed circuit board development."
      caption: "VIDEO / PCB DESIGN"
  - title: "Troubleshooting"
    paragraphs:
      - "When I first powered the circuit, magic smoke was released. At first, I thought it was the boost IC, but eventually found that I had installed the six LEDs the wrong way around."
      - "Once I replaced the LEDs, the circuit worked. However, I was getting much less runtime from the coaster, with my first test only running for 2:25. After a bit of digging, I found that running the ATtiny212 at 20 MHz was eating up most of my power. Following a software update, I got a runtime of 5:05!"
      - "Another critical error was that none of my tests included the top aluminum plate intended for the full design. When I first tested the entire build, nothing happened. I was using 1.6 mm thick aluminum, which was taking too long to heat up and not allowing the boost IC to turn on. Once I switched to 0.5 mm aluminum, the entire design worked!"
    media:
      type: video
      src: videos/tea-troubleshooting.mp4
      poster: images/tea-troubleshooting-poster.webp
      label: "Tea Coaster troubleshooting and development footage."
      caption: "VIDEO / TROUBLESHOOTING"
  - title: "Final test"
    paragraphs:
      - "In my final testing, I was able to get well over the five-minute target! While this was a fun project, it isn’t something I would explore further. As you can see, I use a camping mug at home because it’s the largest one I own. Ceramic mugs don’t transfer enough heat to the top plate to run the circuit, and there likely isn’t much commercial application for such a design."
    media:
      type: video
      src: videos/tea-final-test.mp4
      poster: images/tea-final-test-poster.webp
      label: "Timelapse of the final Tea Coaster test."
      caption: "VIDEO / FINAL TEST"
---
