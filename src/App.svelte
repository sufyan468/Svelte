<script>
  import AboutUs from "./components/AboutUs.svelte";
  import Router from "svelte-spa-router";
  import Cards from "./components/Cards.svelte";
  import Footer from "./components/Footer.svelte";
  import Home from "./components/Home.svelte";
  import Header from "./components/Header.svelte";
  import ContactUs from "./components/ContactUS.svelte";
</script>

<main>
  <Header />
  <Router
    routes={{
      "/": Home,
      "/about": AboutUs,
      "/services": Cards,
      "/ContactUS": ContactUs,
    }}
  />
  <Footer />
</main>

<style>
  a {
    text-decoration: none !important;
  }
  /* :global(body) {
    background-color: #040126;
    color: #0084f6;
    transition: background-color 0.3s;
  }
  :global(body.dark-mode) {
    background-color: #040126 !important;
    color: #bfc2c7 !important;
  } */
</style>
