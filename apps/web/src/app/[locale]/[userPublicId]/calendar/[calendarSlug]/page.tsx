import { notFound } from 'next/navigation';
import connectToDatabase, { User } from '@repo/database';
import BookingWizard from '@/components/Booking/BookingWizard';

interface PageProps {
  params: Promise<{
    userPublicId: string;
    calendarSlug: string;
  }>;
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { userPublicId, calendarSlug } = await params;

  await connectToDatabase();

  // Find user by publicId
  const user = await User.findOne({ publicId: userPublicId });

  if (!user) {
    return notFound();
  }

  // Find the specific calendar by slug and ensure it is public
  // We need to look into the 'calendarPreferences.calendars' array
  const calendarConfig = user.calendarPreferences?.calendars?.find(
    (cal: any) => cal.publicSlug === calendarSlug && cal.isPublic
  );

  if (!calendarConfig) {
    // Calendar not found or not public
    return notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b py-4 px-6 mb-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            {user.firstName || user.email}'s Calendar
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pb-12">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <BookingWizard
            userPublicId={userPublicId}
            calendarSlug={calendarSlug}
            calendarId={calendarConfig.calendarId}
            userId={user._id.toString()}
            userTimezone={user.timezone}
          />
        </div>
      </main>
    </div>
  );
}
