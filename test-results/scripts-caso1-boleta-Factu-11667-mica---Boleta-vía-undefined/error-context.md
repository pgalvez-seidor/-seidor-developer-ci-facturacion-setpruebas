# Page snapshot

```yaml
- generic [ref=e1]:
  - generic:
    - status
    - status
  - generic [ref=e7]:
    - banner "Shell Bar" [ref=e9]:
      - generic [ref=e10]:
        - button "Back" [ref=e11] [cursor=pointer]:
          - generic [ref=e12]: 
        - button "Company Logo" [ref=e13] [cursor=pointer]:
          - img "Company Logo" [ref=e14]
        - generic [ref=e15] [cursor=pointer]:
          - heading "Facturación" [level=1]
          - button "Facturación" [ref=e16]:
            - generic [ref=e17]: Facturación
            - generic [ref=e19]: 
      - generic [ref=e22]:
        - button "Open Search" [ref=e23] [cursor=pointer]:
          - generic [ref=e24]: 
        - button "Profile of Pierre Galvez" [ref=e25] [cursor=pointer]:
          - generic: PG
    - generic [ref=e29]:
      - text:   
      - main "Content" [ref=e35]:
        - text:                              
        - iframe [active] [ref=e36]:
          - alertdialog "Alerta Sesión no permitida por estar fuera de horario" [ref=f1e3]:
            - banner:
              - generic [ref=f1e6]:
                - generic [ref=f1e7]: 
                - heading "Alerta" [level=1] [ref=f1e8]
            - generic [ref=f1e12]: Sesión no permitida por estar fuera de horario
            - contentinfo [ref=f1e13]:
              - button "OK" [active] [ref=f1e16] [cursor=pointer]:
                - generic [ref=f1e18]: OK
    - contentinfo
```