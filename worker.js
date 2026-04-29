/**
 * stream-api - Centralized Cloudflare Stream API
 *
 * Endpoints:
 *   GET  /                    - Health check
 *   GET  /component.js        - Web Component source (public)
 *   GET  /list                - List all videos
 *   GET  /:uid                - Get video metadata + playback URLs
 *   POST /upload              - Direct upload (returns one-time upload URL)
 *   POST /migrate             - Copy video from public URL (R2, etc.) to Stream
 *   POST /:uid/enable-mp4     - Manually trigger MP4 download generation
 *   DELETE /:uid              - Delete video
 */

const STREAM_VIDEO_COMPONENT_B64 = "LyoqCiAqIDxzdHJlYW0tdmlkZW8+IFdlYiBDb21wb25lbnQKICogCiAqIFNtYXJ0IENsb3VkZmxhcmUgU3RyZWFtIHBsYXllciB0aGF0IHBpY2tzIHRoZSBiZXN0IGRlbGl2ZXJ5IG1ldGhvZAogKiBiYXNlZCBvbiB1c2UgY2FzZSAoaGVybyBsb29wLCBmdWxsLWxlbmd0aCBwbGF5YmFjaywgdGh1bWJuYWlsKS4KICogCiAqIFVzYWdlOgogKiAgIDxzY3JpcHQgc3JjPSJodHRwczovL3N0cmVhbS5mb3N0ZXJsYWJzLm9yZy9jb21wb25lbnQuanMiPjwvc2NyaXB0PgogKiAgIAogKiAgIDwhLS0gSGVybyBhdXRvcGxheSBsb29wICh1c2VzIG9wdGltaXplZCBNUDQpIC0tPgogKiAgIDxzdHJlYW0tdmlkZW8gdWlkPSJhYmMxMjMiIG1vZGU9Imhlcm8iIHBvc3Rlci10aW1lPSIycyI+PC9zdHJlYW0tdmlkZW8+CiAqICAgCiAqICAgPCEtLSBGdWxsIHBsYXliYWNrIHdpdGggY29udHJvbHMgKHVzZXMgSExTIGFkYXB0aXZlKSAtLT4KICogICA8c3RyZWFtLXZpZGVvIHVpZD0iYWJjMTIzIiBtb2RlPSJwbGF5ZXIiPjwvc3RyZWFtLXZpZGVvPgogKiAgIAogKiAgIDwhLS0gSWZyYW1lIChDbG91ZGZsYXJlJ3MgYnJhbmRlZCBwbGF5ZXIpIC0tPgogKiAgIDxzdHJlYW0tdmlkZW8gdWlkPSJhYmMxMjMiIG1vZGU9ImlmcmFtZSI+PC9zdHJlYW0tdmlkZW8+CiAqICAgCiAqICAgPCEtLSBKdXN0IGEgdGh1bWJuYWlsIGltYWdlIC0tPgogKiAgIDxzdHJlYW0tdmlkZW8gdWlkPSJhYmMxMjMiIG1vZGU9InRodW1ibmFpbCI+PC9zdHJlYW0tdmlkZW8+CiAqIAogKiBBdHRyaWJ1dGVzOgogKiAgIHVpZCAgICAgICAgICAtIFJlcXVpcmVkLiBDbG91ZGZsYXJlIFN0cmVhbSB2aWRlbyBVSUQuCiAqICAgbW9kZSAgICAgICAgIC0gaGVybyB8IHBsYXllciB8IGlmcmFtZSB8IHRodW1ibmFpbC4gRGVmYXVsdDogcGxheWVyLgogKiAgIHBvc3Rlci10aW1lICAtIFRpbWVzdGFtcCBmb3IgcG9zdGVyIGZyYW1lIChlLmcuICIycyIsICIwcyIpLiBEZWZhdWx0OiAiMHMiLgogKiAgIHN1YmRvbWFpbiAgICAtIE92ZXJyaWRlIGN1c3RvbWVyIHN1YmRvbWFpbi4KICogICBtdXRlZCAgICAgICAgLSBGb3JjZSBtdXRlZCAoZGVmYXVsdDogdHJ1ZSBmb3IgaGVybywgZmFsc2Ugb3RoZXJ3aXNlKS4KICogICBhdXRvcGxheSAgICAgLSBGb3JjZSBhdXRvcGxheSAoZGVmYXVsdDogdHJ1ZSBmb3IgaGVybykuCiAqICAgbG9vcCAgICAgICAgIC0gRm9yY2UgbG9vcCAoZGVmYXVsdDogdHJ1ZSBmb3IgaGVybykuCiAqICAgY29udHJvbHMgICAgIC0gU2hvdyBjb250cm9scyAoZGVmYXVsdDogdHJ1ZSBmb3IgcGxheWVyLCBmYWxzZSBmb3IgaGVybykuCiAqICAgY2xhc3MgICAgICAgIC0gRm9yd2FyZGVkIHRvIGlubmVyIGVsZW1lbnQgZm9yIHN0eWxpbmcuCiAqICAgc3R5bGUgICAgICAgIC0gRm9yd2FyZGVkIHRvIGlubmVyIGVsZW1lbnQuCiAqICAgYWx0ICAgICAgICAgIC0gQWx0IHRleHQgKHRodW1ibmFpbCBtb2RlKS4KICogCiAqIFNsb3RzOgogKiAgIGZhbGxiYWNrICAgICAtIENvbnRlbnQgc2hvd24gaWYgdmlkZW8gZmFpbHMgdG8gbG9hZC4KICovCgoKLy8gSW5qZWN0IGJhc2VsaW5lIHN0eWxlcyBvbmNlCihmdW5jdGlvbigpIHsKICBpZiAoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0cmVhbS12aWRlby1iYXNlLXN0eWxlcycpKSByZXR1cm47CiAgY29uc3QgcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7CiAgcy5pZCA9ICdzdHJlYW0tdmlkZW8tYmFzZS1zdHlsZXMnOwogIHMudGV4dENvbnRlbnQgPSBgCiAgICBzdHJlYW0tdmlkZW8geyBkaXNwbGF5OiBibG9jazsgcG9zaXRpb246IHJlbGF0aXZlOyB9CiAgICBzdHJlYW0tdmlkZW9bbW9kZT0idGh1bWJuYWlsIl0geyBkaXNwbGF5OiBpbmxpbmUtYmxvY2s7IH0KICAgIHN0cmVhbS12aWRlbyA+IHZpZGVvLCBzdHJlYW0tdmlkZW8gPiBpZnJhbWUsIHN0cmVhbS12aWRlbyA+IGltZyB7CiAgICAgIGRpc3BsYXk6IGJsb2NrOwogICAgICBtYXgtd2lkdGg6IDEwMCU7CiAgICB9CiAgICAvKiBXaGVuIHBhcmVudCBoYXMgZml4ZWQgZGltZW5zaW9ucyAoZS5nLiAuaGVyby12aWRlby1iZyksIGZpbGwgaXQgKi8KICAgIHN0cmVhbS12aWRlbyA+IHZpZGVvW2F1dG9wbGF5XVttdXRlZF1bbG9vcF0gewogICAgICB3aWR0aDogMTAwJTsKICAgICAgaGVpZ2h0OiAxMDAlOwogICAgICBvYmplY3QtZml0OiBjb3ZlcjsKICAgIH0KICBgOwogIChkb2N1bWVudC5oZWFkIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCkuYXBwZW5kQ2hpbGQocyk7Cn0pKCk7Cgpjb25zdCBERUZBVUxUX1NVQkRPTUFJTiA9ICdjdXN0b21lci1peTY0MnplMjB0cTd3Mmh6LmNsb3VkZmxhcmVzdHJlYW0uY29tJzsKCmNsYXNzIFN0cmVhbVZpZGVvIGV4dGVuZHMgSFRNTEVsZW1lbnQgewogIHN0YXRpYyBnZXQgb2JzZXJ2ZWRBdHRyaWJ1dGVzKCkgewogICAgcmV0dXJuIFsndWlkJywgJ21vZGUnLCAncG9zdGVyLXRpbWUnLCAnc3ViZG9tYWluJywgJ211dGVkJywgJ2F1dG9wbGF5JywgJ2xvb3AnLCAnY29udHJvbHMnLCAnYWx0J107CiAgfQoKICBjb25uZWN0ZWRDYWxsYmFjaygpIHsKICAgIHRoaXMucmVuZGVyKCk7CiAgfQoKICBhdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2soKSB7CiAgICBpZiAodGhpcy5pc0Nvbm5lY3RlZCkgdGhpcy5yZW5kZXIoKTsKICB9CgogIGdldCBzdWJkb21haW4oKSB7CiAgICByZXR1cm4gdGhpcy5nZXRBdHRyaWJ1dGUoJ3N1YmRvbWFpbicpIHx8IERFRkFVTFRfU1VCRE9NQUlOOwogIH0KCiAgZ2V0IHVpZCgpIHsKICAgIHJldHVybiB0aGlzLmdldEF0dHJpYnV0ZSgndWlkJyk7CiAgfQoKICBnZXQgbW9kZSgpIHsKICAgIHJldHVybiAodGhpcy5nZXRBdHRyaWJ1dGUoJ21vZGUnKSB8fCAncGxheWVyJykudG9Mb3dlckNhc2UoKTsKICB9CgogIHVybChwYXRoKSB7CiAgICByZXR1cm4gYGh0dHBzOi8vJHt0aGlzLnN1YmRvbWFpbn0vJHt0aGlzLnVpZH0vJHtwYXRofWA7CiAgfQoKICAvLyBCb29sZWFuIGF0dHJpYnV0ZSBoZWxwZXIgLSBzdXBwb3J0cyAidHJ1ZSIsICJmYWxzZSIsIHByZXNlbmNlLCBhYnNlbmNlCiAgYm9vbEF0dHIobmFtZSwgZGVmYXVsdFZhbHVlKSB7CiAgICBpZiAoIXRoaXMuaGFzQXR0cmlidXRlKG5hbWUpKSByZXR1cm4gZGVmYXVsdFZhbHVlOwogICAgY29uc3QgdiA9IHRoaXMuZ2V0QXR0cmlidXRlKG5hbWUpOwogICAgcmV0dXJuIHYgIT09ICdmYWxzZScgJiYgdiAhPT0gJzAnICYmIHYgIT09ICdubyc7CiAgfQoKICByZW5kZXIoKSB7CiAgICBjb25zdCB1aWQgPSB0aGlzLnVpZDsKICAgIGlmICghdWlkKSB7CiAgICAgIHRoaXMuaW5uZXJIVE1MID0gJzwhLS0gc3RyZWFtLXZpZGVvOiBtaXNzaW5nIHVpZCAtLT4nOwogICAgICByZXR1cm47CiAgICB9CgogICAgY29uc3QgbW9kZSA9IHRoaXMubW9kZTsKICAgIGNvbnN0IHBvc3RlclRpbWUgPSB0aGlzLmdldEF0dHJpYnV0ZSgncG9zdGVyLXRpbWUnKSB8fCAnMHMnOwogICAgY29uc3Qga2xhc3MgPSB0aGlzLmdldEF0dHJpYnV0ZSgnY2xhc3MnKSB8fCAnJzsKICAgIGNvbnN0IHN0eWxlID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ3N0eWxlJykgfHwgJyc7CgogICAgLy8gRm9yd2FyZCBzdHlsaW5nIHRvIGlubmVyIGVsZW1lbnQgb25seSB3aGVuIHNldCBvbiBob3N0CiAgICBjb25zdCBpbm5lckF0dHJzID0gW107CiAgICBpZiAoa2xhc3MpIGlubmVyQXR0cnMucHVzaChgY2xhc3M9IiR7dGhpcy5lc2NhcGVBdHRyKGtsYXNzKX0iYCk7CiAgICBpZiAoc3R5bGUpIGlubmVyQXR0cnMucHVzaChgc3R5bGU9IiR7dGhpcy5lc2NhcGVBdHRyKHN0eWxlKX0iYCk7CgogICAgbGV0IGh0bWw7CiAgICBzd2l0Y2ggKG1vZGUpIHsKICAgICAgY2FzZSAnaGVybyc6CiAgICAgICAgaHRtbCA9IHRoaXMucmVuZGVySGVybyhpbm5lckF0dHJzLCBwb3N0ZXJUaW1lKTsKICAgICAgICBicmVhazsKICAgICAgY2FzZSAnaWZyYW1lJzoKICAgICAgICBodG1sID0gdGhpcy5yZW5kZXJJZnJhbWUoaW5uZXJBdHRycywgcG9zdGVyVGltZSk7CiAgICAgICAgYnJlYWs7CiAgICAgIGNhc2UgJ3RodW1ibmFpbCc6CiAgICAgICAgaHRtbCA9IHRoaXMucmVuZGVyVGh1bWJuYWlsKGlubmVyQXR0cnMsIHBvc3RlclRpbWUpOwogICAgICAgIGJyZWFrOwogICAgICBjYXNlICdwbGF5ZXInOgogICAgICBkZWZhdWx0OgogICAgICAgIGh0bWwgPSB0aGlzLnJlbmRlclBsYXllcihpbm5lckF0dHJzLCBwb3N0ZXJUaW1lKTsKICAgICAgICBicmVhazsKICAgIH0KCiAgICB0aGlzLmlubmVySFRNTCA9IGh0bWw7CgogICAgLy8gV2lyZSB1cCBITFMgZm9yIHBsYXllciBtb2RlIGlmIGJyb3dzZXIgZG9lc24ndCBuYXRpdmVseSBzdXBwb3J0IGl0CiAgICBpZiAobW9kZSA9PT0gJ3BsYXllcicpIHRoaXMuYXR0YWNoSGxzSWZOZWVkZWQoKTsKICB9CgogIHJlbmRlckhlcm8oaW5uZXJBdHRycywgcG9zdGVyVGltZSkgewogICAgLy8gSGVybyBsb29wcyB1c2UgTVA0IGRvd25sb2FkIFVSTCAoZmFzdGVyIHRoYW4gSExTIGZvciBzaG9ydCBhdXRvcGxheSBsb29wcykKICAgIGNvbnN0IG11dGVkID0gdGhpcy5ib29sQXR0cignbXV0ZWQnLCB0cnVlKTsKICAgIGNvbnN0IGF1dG9wbGF5ID0gdGhpcy5ib29sQXR0cignYXV0b3BsYXknLCB0cnVlKTsKICAgIGNvbnN0IGxvb3AgPSB0aGlzLmJvb2xBdHRyKCdsb29wJywgdHJ1ZSk7CiAgICBjb25zdCBjb250cm9scyA9IHRoaXMuYm9vbEF0dHIoJ2NvbnRyb2xzJywgZmFsc2UpOwoKICAgIGNvbnN0IGF0dHJzID0gWwogICAgICBhdXRvcGxheSA/ICdhdXRvcGxheScgOiAnJywKICAgICAgbXV0ZWQgPyAnbXV0ZWQnIDogJycsCiAgICAgIGxvb3AgPyAnbG9vcCcgOiAnJywKICAgICAgY29udHJvbHMgPyAnY29udHJvbHMnIDogJycsCiAgICAgICdwbGF5c2lubGluZScsCiAgICAgICdwcmVsb2FkPSJtZXRhZGF0YSInLAogICAgICBgcG9zdGVyPSIke3RoaXMudXJsKGB0aHVtYm5haWxzL3RodW1ibmFpbC5qcGc/dGltZT0ke3Bvc3RlclRpbWV9YCl9ImAsCiAgICAgIC4uLmlubmVyQXR0cnMsCiAgICBdLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7CgogICAgcmV0dXJuIGA8dmlkZW8gJHthdHRyc30+CiAgPHNvdXJjZSBzcmM9IiR7dGhpcy51cmwoJ2Rvd25sb2Fkcy9kZWZhdWx0Lm1wNCcpfSIgdHlwZT0idmlkZW8vbXA0Ij4KICA8c2xvdCBuYW1lPSJmYWxsYmFjayI+WW91ciBicm93c2VyIGRvZXMgbm90IHN1cHBvcnQgdmlkZW8uPC9zbG90Pgo8L3ZpZGVvPmA7CiAgfQoKICByZW5kZXJQbGF5ZXIoaW5uZXJBdHRycywgcG9zdGVyVGltZSkgewogICAgLy8gRnVsbCBwbGF5YmFjayB1c2VzIEhMUyAoYWRhcHRpdmUgYml0cmF0ZSkKICAgIGNvbnN0IG11dGVkID0gdGhpcy5ib29sQXR0cignbXV0ZWQnLCBmYWxzZSk7CiAgICBjb25zdCBhdXRvcGxheSA9IHRoaXMuYm9vbEF0dHIoJ2F1dG9wbGF5JywgZmFsc2UpOwogICAgY29uc3QgbG9vcCA9IHRoaXMuYm9vbEF0dHIoJ2xvb3AnLCBmYWxzZSk7CiAgICBjb25zdCBjb250cm9scyA9IHRoaXMuYm9vbEF0dHIoJ2NvbnRyb2xzJywgdHJ1ZSk7CgogICAgY29uc3QgYXR0cnMgPSBbCiAgICAgIGF1dG9wbGF5ID8gJ2F1dG9wbGF5JyA6ICcnLAogICAgICBtdXRlZCA/ICdtdXRlZCcgOiAnJywKICAgICAgbG9vcCA/ICdsb29wJyA6ICcnLAogICAgICBjb250cm9scyA/ICdjb250cm9scycgOiAnJywKICAgICAgJ3BsYXlzaW5saW5lJywKICAgICAgJ3ByZWxvYWQ9Im1ldGFkYXRhIicsCiAgICAgIGBwb3N0ZXI9IiR7dGhpcy51cmwoYHRodW1ibmFpbHMvdGh1bWJuYWlsLmpwZz90aW1lPSR7cG9zdGVyVGltZX1gKX0iYCwKICAgICAgYGRhdGEtaGxzPSIke3RoaXMudXJsKCdtYW5pZmVzdC92aWRlby5tM3U4Jyl9ImAsCiAgICAgIGBkYXRhLW1wND0iJHt0aGlzLnVybCgnZG93bmxvYWRzL2RlZmF1bHQubXA0Jyl9ImAsCiAgICAgIC4uLmlubmVyQXR0cnMsCiAgICBdLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7CgogICAgcmV0dXJuIGA8dmlkZW8gJHthdHRyc30+CiAgPHNsb3QgbmFtZT0iZmFsbGJhY2siPllvdXIgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IHZpZGVvLjwvc2xvdD4KPC92aWRlbz5gOwogIH0KCiAgcmVuZGVySWZyYW1lKGlubmVyQXR0cnMsIHBvc3RlclRpbWUpIHsKICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMoKTsKICAgIGlmICh0aGlzLmJvb2xBdHRyKCdhdXRvcGxheScsIGZhbHNlKSkgcGFyYW1zLnNldCgnYXV0b3BsYXknLCAndHJ1ZScpOwogICAgaWYgKHRoaXMuYm9vbEF0dHIoJ211dGVkJywgZmFsc2UpKSBwYXJhbXMuc2V0KCdtdXRlZCcsICd0cnVlJyk7CiAgICBpZiAodGhpcy5ib29sQXR0cignbG9vcCcsIGZhbHNlKSkgcGFyYW1zLnNldCgnbG9vcCcsICd0cnVlJyk7CiAgICBpZiAocG9zdGVyVGltZSAhPT0gJzBzJykgcGFyYW1zLnNldCgncG9zdGVyJywgYCR7dGhpcy51cmwoJ3RodW1ibmFpbHMvdGh1bWJuYWlsLmpwZycpfT90aW1lPSR7cG9zdGVyVGltZX1gKTsKICAgIAogICAgY29uc3QgcXMgPSBwYXJhbXMudG9TdHJpbmcoKTsKICAgIGNvbnN0IHNyYyA9IGAke3RoaXMudXJsKCdpZnJhbWUnKX0ke3FzID8gJz8nICsgcXMgOiAnJ31gOwoKICAgIGNvbnN0IGF0dHJzID0gWwogICAgICBgc3JjPSIke3NyY30iYCwKICAgICAgJ2FsbG93PSJhY2NlbGVyb21ldGVyOyBneXJvc2NvcGU7IGF1dG9wbGF5OyBlbmNyeXB0ZWQtbWVkaWE7IHBpY3R1cmUtaW4tcGljdHVyZTsiJywKICAgICAgJ2FsbG93ZnVsbHNjcmVlbicsCiAgICAgICdsb2FkaW5nPSJsYXp5IicsCiAgICAgIC4uLmlubmVyQXR0cnMsCiAgICBdLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7CgogICAgcmV0dXJuIGA8aWZyYW1lICR7YXR0cnN9PjwvaWZyYW1lPmA7CiAgfQoKICByZW5kZXJUaHVtYm5haWwoaW5uZXJBdHRycywgcG9zdGVyVGltZSkgewogICAgY29uc3QgYWx0ID0gdGhpcy5nZXRBdHRyaWJ1dGUoJ2FsdCcpIHx8ICdWaWRlbyB0aHVtYm5haWwnOwogICAgY29uc3QgYXR0cnMgPSBbCiAgICAgIGBzcmM9IiR7dGhpcy51cmwoYHRodW1ibmFpbHMvdGh1bWJuYWlsLmpwZz90aW1lPSR7cG9zdGVyVGltZX1gKX0iYCwKICAgICAgYGFsdD0iJHt0aGlzLmVzY2FwZUF0dHIoYWx0KX0iYCwKICAgICAgJ2xvYWRpbmc9ImxhenkiJywKICAgICAgLi4uaW5uZXJBdHRycywKICAgIF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTsKCiAgICByZXR1cm4gYDxpbWcgJHthdHRyc30+YDsKICB9CgogIGF0dGFjaEhsc0lmTmVlZGVkKCkgewogICAgY29uc3QgdmlkZW8gPSB0aGlzLnF1ZXJ5U2VsZWN0b3IoJ3ZpZGVvJyk7CiAgICBpZiAoIXZpZGVvKSByZXR1cm47CiAgICBjb25zdCBobHMgPSB2aWRlby5kYXRhc2V0LmhsczsKICAgIGNvbnN0IG1wNCA9IHZpZGVvLmRhdGFzZXQubXA0OwogICAgaWYgKCFobHMpIHJldHVybjsKCiAgICAvLyBTYWZhcmkgYW5kIGlPUyBzdXBwb3J0IEhMUyBuYXRpdmVseQogICAgaWYgKHZpZGVvLmNhblBsYXlUeXBlKCdhcHBsaWNhdGlvbi92bmQuYXBwbGUubXBlZ3VybCcpKSB7CiAgICAgIHZpZGVvLnNyYyA9IGhsczsKICAgICAgcmV0dXJuOwogICAgfQoKICAgIC8vIE90aGVyIGJyb3dzZXJzOiB0cnkgaGxzLmpzCiAgICBpZiAod2luZG93LkhscyAmJiB3aW5kb3cuSGxzLmlzU3VwcG9ydGVkKCkpIHsKICAgICAgY29uc3QgaGxzSW5zdGFuY2UgPSBuZXcgd2luZG93LkhscygpOwogICAgICBobHNJbnN0YW5jZS5sb2FkU291cmNlKGhscyk7CiAgICAgIGhsc0luc3RhbmNlLmF0dGFjaE1lZGlhKHZpZGVvKTsKICAgICAgaGxzSW5zdGFuY2Uub24od2luZG93Lkhscy5FdmVudHMuRVJST1IsICgpID0+IHsKICAgICAgICAvLyBGYWxsYmFjayB0byBNUDQgaWYgSExTIGZhaWxzCiAgICAgICAgdmlkZW8uc3JjID0gbXA0OwogICAgICB9KTsKICAgICAgcmV0dXJuOwogICAgfQoKICAgIC8vIE5vIEhMUyBzdXBwb3J0IGFuZCBubyBobHMuanMg4oCUIHVzZSBNUDQgZmFsbGJhY2sKICAgIHZpZGVvLnNyYyA9IG1wNDsKICAgIAogICAgLy8gT3B0aW9uYWxseSBsYXp5LWxvYWQgaGxzLmpzIG9uY2UgYW5kIHJlLWF0dGVtcHQKICAgIGlmICghd2luZG93Ll9fc3RyZWFtVmlkZW9IbHNMb2FkaW5nKSB7CiAgICAgIHdpbmRvdy5fX3N0cmVhbVZpZGVvSGxzTG9hZGluZyA9IHRydWU7CiAgICAgIGNvbnN0IHNjcmlwdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpOwogICAgICBzY3JpcHQuc3JjID0gJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vaGxzLmpzQDEnOwogICAgICBzY3JpcHQub25sb2FkID0gKCkgPT4gewogICAgICAgIC8vIFJlLXJlbmRlciBhbnkgcGxheWVyLW1vZGUgY29tcG9uZW50cyBvbiB0aGUgcGFnZQogICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ3N0cmVhbS12aWRlb1ttb2RlPSJwbGF5ZXIiXSwgc3RyZWFtLXZpZGVvOm5vdChbbW9kZV0pJykuZm9yRWFjaChlbCA9PiB7CiAgICAgICAgICBpZiAoZWwuYXR0YWNoSGxzSWZOZWVkZWQpIGVsLmF0dGFjaEhsc0lmTmVlZGVkKCk7CiAgICAgICAgfSk7CiAgICAgIH07CiAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc2NyaXB0KTsKICAgIH0KICB9CgogIGVzY2FwZUF0dHIocykgewogICAgcmV0dXJuIFN0cmluZyhzKS5yZXBsYWNlKC8iL2csICcmcXVvdDsnKS5yZXBsYWNlKC88L2csICcmbHQ7Jyk7CiAgfQp9CgppZiAoIWN1c3RvbUVsZW1lbnRzLmdldCgnc3RyZWFtLXZpZGVvJykpIHsKICBjdXN0b21FbGVtZW50cy5kZWZpbmUoJ3N0cmVhbS12aWRlbycsIFN0cmVhbVZpZGVvKTsKfQoKLy8gRXhwb3J0IGZvciBFUyBtb2R1bGVzIC8gYnVuZGxlcnMKaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7CiAgbW9kdWxlLmV4cG9ydHMgPSBTdHJlYW1WaWRlbzsKfQo=";

function decodeComponent() {
  // atob → bytes → utf-8 string
  const bin = atob(STREAM_VIDEO_COMPONENT_B64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

const ACCOUNT_ID = '77f3d6611f5ceab7651744268d434342';
const STREAM_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream`;
const CUSTOMER_SUBDOMAIN = 'customer-iy642ze20tq7w2hz.cloudflarestream.com';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const json = (data, status = 200) => new Response(JSON.stringify(data, null, 2), {
  status,
  headers: { 'Content-Type': 'application/json', ...cors },
});

const err = (msg, status = 400) => json({ success: false, error: msg }, status);

async function streamFetch(env, path, options = {}) {
  const res = await fetch(`${STREAM_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${env.STREAM_API_TOKEN}`,
      ...(options.headers || {}),
    },
  });
  return res.json();
}

function buildPlaybackUrls(uid) {
  return {
    hls: `https://${CUSTOMER_SUBDOMAIN}/${uid}/manifest/video.m3u8`,
    dash: `https://${CUSTOMER_SUBDOMAIN}/${uid}/manifest/video.mpd`,
    iframe: `https://${CUSTOMER_SUBDOMAIN}/${uid}/iframe`,
    thumbnail: `https://${CUSTOMER_SUBDOMAIN}/${uid}/thumbnails/thumbnail.jpg`,
    mp4_download: `https://${CUSTOMER_SUBDOMAIN}/${uid}/downloads/default.mp4`,
  };
}

function checkAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === env.STREAM_AUTH_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const path = url.pathname;

    // Health check (public)
    if (path === '/' || path === '/health') {
      return json({
        service: 'stream-api',
        status: 'ok',
        subdomain: CUSTOMER_SUBDOMAIN,
        endpoints: ['GET /list', 'GET /:uid', 'POST /upload', 'POST /migrate', 'POST /:uid/enable-mp4', 'DELETE /:uid', 'GET /component.js'],
      });
    }

    // Component JS (public)
    if (path === '/component.js' || path === '/stream-video.js') {
      return new Response(decodeComponent(), {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=300, s-maxage=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Auth required for everything else
    if (!checkAuth(request, env)) return err('unauthorized', 401);

    // GET /list
    if (path === '/list' && request.method === 'GET') {
      const data = await streamFetch(env, '');
      if (!data.success) return err(data.errors?.[0]?.message || 'list failed', 500);
      const videos = (data.result || []).map(v => ({
        uid: v.uid,
        name: v.meta?.name || v.uid,
        duration: v.duration,
        size: v.size,
        ready: v.readyToStream,
        created: v.created,
        urls: buildPlaybackUrls(v.uid),
      }));
      return json({ success: true, count: videos.length, videos });
    }

    // POST /upload
    if (path === '/upload' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const data = await streamFetch(env, '/direct_upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxDurationSeconds: body.maxDurationSeconds || 3600,
          meta: body.meta || {},
          requireSignedURLs: body.requireSignedURLs || false,
        }),
      });
      if (!data.success) return err(data.errors?.[0]?.message || 'upload init failed', 500);
      return json({ success: true, uploadURL: data.result.uploadURL, uid: data.result.uid });
    }

    // POST /migrate
    if (path === '/migrate' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (!body.url) return err('url required');
      const data = await streamFetch(env, '/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: body.url,
          meta: body.meta || { name: body.url.split('/').pop() },
        }),
      });
      if (!data.success) return err(data.errors?.[0]?.message || 'migrate failed', 500);

      // Fire-and-forget: trigger MP4 download generation
      streamFetch(env, `/${data.result.uid}/downloads`, { method: 'POST' }).catch(() => {});

      return json({
        success: true,
        uid: data.result.uid,
        urls: buildPlaybackUrls(data.result.uid),
        status: data.result.status,
        note: 'MP4 download generation triggered; available within 1-2 min after video is ready',
      });
    }

    // POST /:uid/enable-mp4
    if (path.endsWith('/enable-mp4') && request.method === 'POST') {
      const uid = path.split('/')[1];
      const data = await streamFetch(env, `/${uid}/downloads`, { method: 'POST' });
      if (!data.success) return err(data.errors?.[0]?.message || 'enable failed', 500);
      return json({ success: true, status: data.result.default });
    }

    // GET /:uid
    if (request.method === 'GET' && path.length > 1) {
      const uid = path.slice(1);
      const data = await streamFetch(env, `/${uid}`);
      if (!data.success) return err(data.errors?.[0]?.message || 'not found', 404);
      const v = data.result;
      return json({
        success: true,
        uid: v.uid,
        name: v.meta?.name,
        duration: v.duration,
        ready: v.readyToStream,
        status: v.status,
        urls: buildPlaybackUrls(v.uid),
      });
    }

    // DELETE /:uid
    if (request.method === 'DELETE' && path.length > 1) {
      const uid = path.slice(1);
      const data = await streamFetch(env, `/${uid}`, { method: 'DELETE' });
      if (!data.success) return err(data.errors?.[0]?.message || 'delete failed', 500);
      return json({ success: true, deleted: uid });
    }

    return err('not found', 404);
  },
};
