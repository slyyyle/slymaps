import { GraphQLClient, gql } from 'graphql-request';
import { OTP_BASE_URL } from '@/lib/constants';

if (!OTP_BASE_URL) {
  throw new Error('OTP_BASE_URL must be set to your OTP GraphQL endpoint in .env');
}

export const otpClient = new GraphQLClient(`${OTP_BASE_URL}/otp/routers/default/index/graphql`, {
  headers: {
    'Content-Type': 'application/json',
    'OTPTimeout': '180000'
  }
});

export const PLAN_QUERY = gql`
query plan($from: InputCoordinates!, $to: InputCoordinates!, $date: String!, $time: String!) {
  plan(from: $from, to: $to, date: $date, time: $time, transportModes: [{ mode: WALK }, { mode: TRANSIT }]) {
    itineraries {
      duration
      start
      end
      walkTime
      waitingTime
      walkDistance
      numberOfTransfers
      legs {
        mode
        start { scheduledTime }
        end { scheduledTime }
        distance
        duration
        legGeometry {
          points
          length
        }
        from {
          name
          lat
          lon
        }
        to {
          name
          lat
          lon
        }
        # Transit-specific details
        headsign
        route {
          shortName
          longName
          gtfsId
          agency {
            name
          }
        }
      }
    }
  }
}
`; 