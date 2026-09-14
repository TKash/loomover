import { requireProfile } from '@/lib/auth/guards'
import LotForm from '@/components/LotForm'

export default async function NewLotPage() {
  await requireProfile()

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-6">
      <h1 className="mb-4 text-xl font-semibold">Post a surplus lot</h1>
      <LotForm />
    </main>
  )
}
