<script lang="ts">
  import { Users } from '@lucide/svelte';
  import PlaceholderScreen from '../components/PlaceholderScreen.svelte';
  import { strings } from '../i18n/strings.de';
</script>

<PlaceholderScreen
  icon={Users}
  heading={strings.placeholder.heading(strings.nav.registration)}
  body={strings.placeholder.body}
/>
