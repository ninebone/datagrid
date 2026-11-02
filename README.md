# Ninelab HTML Table (`@ninelab/table`)

> **Blazing-fast performance powered by native HTML tags** — A next-generation table extension supporting 1,000,000+ rows virtual rendering and seamless inline editing out of the box.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/badge/npm-v1.0.0-blue.svg)](https://www.npmjs.com/)

Tired of heavy, overly complex JavaScript data grids? **Ninelab HTML Table** preserves the familiar structure of native HTML tags while leveraging advanced DOM virtualization to handle massive datasets effortlessly and provide a frictionless inline editing experience.

---

## Key Features

- **1M+ DOM Virtualized Rendering:** Scroll and render over a million rows in a fraction of a second without dropping frames.
- **Seamless Inline Editing & Form Binding:** Native support for Text, Number, Date, Color, Checkbox, Radio, and Combo (Autocomplete) input types.
- **HTML Tag-Based (Zero Learning Curve):** No complicated JS configuration objects required—build tables using familiar tag structures.
- **Shadow DOM & CSS Variables:** Perfect style encapsulation with zero CSS pollution, easily customizable via CSS variables.
- **Framework Agnostic:** Drops seamlessly into React, Vue, Svelte, or Vanilla JS.

---

## Live Demo & Previews

![Ninelab HTML Table Demo](//https://raw.githubusercontent.com/ninebone/datagrid/main/assets/demo.gif)

- [Live Demo (Coming Soon)](https://github.com/ninebone/nine-lab)

### Framework Examples & Input Demos
- [Vanilla JS Examples](#)
- [React Examples](#)

---

## Quick Start

### 1. Installation

```bash
npm install @ninebone/datagrid

<!-- HTML example -->

<html>
<head>
    <script type="text/javascript" src="[https://cdn.jsdelivr.net/npm/@ninebone/table@latest/dist/nine-table.umd.js](https://cdn.jsdelivr.net/npm/@ninebone/table@latest/dist/nine-table.umd.js)"></script>
</head>
<body>

    <div style="height: 600px;">
      <ninelab-table show-footer="true">
          <table row-indicator="true">
              <colgroup>
                  <col width="50" fixed="left"/>
                  <col width="130"/>
                  <col width="100"/>
                  <col width="110"/>
              </colgroup>
              <thead>
                  <tr>
                      <th cell-type="checkbox"></th>
                      <th>Avatar & Name</th>
                      <th>Status Badge</th>
                      <th>Input Editor</th>
                  </tr>
              </thead>
              <tbody>
                  <tr>
                      <!-- Checkbox Cell -->
                      <td data-bind="sel" cell-type="checkbox"></td>
                      
                      <!-- Custom Image Renderer -->
                      <td data-bind="NAME" data-expr="host.renderImage(data.PIC)" html="true"></td>
                      
                      <!-- Custom Badge / Chart Renderer -->
                      <td data-expr="host.renderBadge(data.REC1, data.REC2)" html="true"></td>
                      
                      <!-- Inline Input Binding -->
                      <td data-bind="NAME" cell-type="input" enable="data.REC1 > 30"></td>
                  </tr>
              </tbody>
          </table>
      </ninelab-table>
    </div>

    <script>
        const grd = document.querySelector("nine-table");

        grd.addEventListener("load", () => {
            // Define custom host helper functions used in data-expr
            grd.renderImage = (v) => `<img src="${v}" width="40" height="40" style="border-radius:50%;" />`;
            
            grd.renderBadge = (v1, v2) => `<span>Score: ${Number(v1) + Number(v2)}</span>`;

            // Bind Data
            grd.loading = true;
            grd.data.set([{
              A: "a",
              ...
            },
            ...
            ]);
        });
    </script>
</body>
</html>

```

## LICENSE
MIT © 2026 ninebone
