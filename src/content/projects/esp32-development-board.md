---
slug: esp32-development-board
projectId: BM-002
title: ESP32 Development Board
description: A custom ESP32 development board with an 18650 battery, charging, buck/boost regulation, and protection circuitry.
category: [ELECTRONICS]
thumbnail: images/esp32-overview.webp
hero: images/esp32-overview.webp
imageAlt: ESP32 development board PCB layout, showing copper traces, pin headers, and component footprints.
thumbnailFit: contain
thumbnailZoom: 1.7
imageRotation: -90
featured: true
order: 2
placeholder: false
sections:
  - title: "Project overview"
    paragraphs:
      - "I’ve heard the ESP32 called the “sledgehammer” of microcontrollers. The series is loved for its ease of programming, built-in Wi-Fi and Bluetooth, and extensive documentation. Many builders use the ESP32, and I wanted to learn how to design a board with one."
      - "The goal of this project was to build a custom development board with an ESP32, an 18650 battery, a charge IC, a buck/boost IC, and a protection IC for the battery. For me, these were the fundamentals I wanted to carry into future designs."
    media:
      type: image
      src: images/esp32-overview.webp
      alt: "ESP32 development board PCB layout, showing copper traces, pin headers, and component footprints."
      fit: contain
      rotation: -90
      zoom: 1.7
      caption: "PCB / LAYOUT VIEW"
  - title: "Testing"
    paragraphs:
      - "There are few feelings quite as exciting as getting a PCB you designed to blink an LED. I was able to program the ESP32 over USB, the 18650 battery would charge, and the buck/boost IC provided a constant 3.3 V."
      - "This design does have one issue: the protection IC does not consistently stop the battery from discharging below its operating range. I attempted to replace the MOSFETs, but the issue persisted. The design does not include real-time battery voltage readings by the microcontroller, let alone a fuel gauge. As a result, what was meant to be a last-resort protection is the only means of protection."
    media:
      type: video
      src: videos/esp32-development.mp4
      poster: images/esp32-development-poster.webp
      label: "ESP32 Development Board testing demonstration."
      caption: "VIDEO / TESTING"
  - title: "Next steps"
    paragraphs:
      - "I learned a good deal by creating this design, and the project instilled a lot of confidence in my ability to design more complex PCBs in the future."
    media:
      type: video
      src: videos/esp32-testing.mp4
      poster: images/esp32-testing-poster.webp
      label: "ESP32 Development Board battery-powered demonstration."
      caption: "VIDEO / NEXT STEPS"
---
