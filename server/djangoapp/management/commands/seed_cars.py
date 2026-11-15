from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError

from djangoapp.populate import initiate


class Command(BaseCommand):
    help = "Import the IBM car makes and models fixture without duplicating records."

    def add_arguments(self, parser):
        parser.add_argument(
            "--fixture", help="Path to a compatible car_records.json file."
        )

    def handle(self, *args, **options):
        try:
            makes, new_models = initiate(options["fixture"])
        except (KeyError, OSError, TypeError, ValidationError, ValueError) as error:
            raise CommandError(f"Could not load car records: {error}") from error
        if options["verbosity"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Processed {makes} car makes, added {new_models} models."
                )
            )
