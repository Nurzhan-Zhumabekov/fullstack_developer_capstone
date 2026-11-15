import json
from pathlib import Path

from django.conf import settings
from django.db import transaction

from .models import CarMake, CarModel


@transaction.atomic
def initiate(fixture_path=None):
    path = Path(fixture_path or settings.BASE_DIR / "database/data/car_records.json")
    with path.open(encoding="utf-8") as fixture:
        cars = json.load(fixture)["cars"]

    makes = {}
    created_count = 0
    for entry in cars:
        make_name = entry["make"].strip()
        if make_name not in makes:
            makes[make_name], _ = CarMake.objects.get_or_create(name=make_name)
        vehicle = CarModel(
            car_make=makes[make_name],
            name=entry["model"].strip(),
            type=entry["bodyType"],
            year=entry["year"],
        )
        vehicle.full_clean(validate_unique=False, validate_constraints=False)
        _, created = CarModel.objects.get_or_create(
            car_make=vehicle.car_make,
            name=vehicle.name,
            type=vehicle.type,
            year=vehicle.year,
        )
        created_count += created
    return len(makes), created_count
